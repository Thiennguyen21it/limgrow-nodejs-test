const mongoose = require("mongoose");

const watchfaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    downloadUrl: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      default: "Free",
    },
    author: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    compatibility: [
      {
        type: String,
        trim: true,
      },
    ],
    size: {
      type: String,
    },
    version: {
      type: String,
    },
    releaseDate: {
      type: Date,
    },
    lastUpdated: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      scrapedAt: {
        type: Date,
        default: Date.now,
      },
      sourceUrl: {
        type: String,
        required: true,
      },
      originalId: {
        type: String,
        index: true,
      },
      faceId: {
        type: String,
        index: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
watchfaceSchema.index({ name: "text", description: "text" });
watchfaceSchema.index({ category: 1, createdAt: -1 });
watchfaceSchema.index({ "metadata.scrapedAt": 1 });
watchfaceSchema.index({ isActive: 1 });

// Virtual for formatted price
watchfaceSchema.virtual("formattedPrice").get(function () {
  if (this.price === "Free" || this.price === "0" || !this.price) {
    return "Free";
  }
  return this.price;
});

// Instance method to check if watchface is recent
watchfaceSchema.methods.isRecent = function () {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return this.createdAt > oneWeekAgo;
};

// Static method to find by category
watchfaceSchema.statics.findByCategory = function (
  category,
  limit = 10,
  skip = 0
) {
  return this.find({
    category: new RegExp(category, "i"),
    isActive: true,
  })
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
};

// Static method for search
watchfaceSchema.statics.search = function (query, options = {}) {
  const {
    limit = 10,
    skip = 0,
    category,
    sortBy = "createdAt",
    sortOrder = -1,
  } = options;

  let searchQuery = { isActive: true };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  if (category) {
    searchQuery.category = new RegExp(category, "i");
  }

  return this.find(searchQuery)
    .limit(limit)
    .skip(skip)
    .sort({ [sortBy]: sortOrder });
};

// Pre-save middleware to set lastUpdated
watchfaceSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

const Watchface = mongoose.model("Watchface", watchfaceSchema);

module.exports = Watchface;
