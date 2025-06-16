const express = require("express");
const { query, validationResult } = require("express-validator");
const Watchface = require("../models/Watchface");
const logger = require("../utils/logger");
const cache = require("../middleware/cache");

const router = express.Router();

// Validation middleware
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("PageSize must be between 1 and 100"),
];

const validateSearch = [
  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be 1-100 characters"),
  query("category")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Category must be 1-50 characters"),
  query("sortBy")
    .optional()
    .isIn(["name", "createdAt", "updatedAt", "rating", "downloads"])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc", "1", "-1"])
    .withMessage("Sort order must be asc/desc or 1/-1"),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// Helper function to build response metadata
const buildResponseMetadata = (watchfaces, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
    resultsCount: watchfaces.length,
  };
};

// GET /api/watchfaces - Get all watchfaces with pagination and filtering
router.get(
  "/",
  validatePagination,
  validateSearch,
  handleValidationErrors,
  cache(300), // Cache for 5 minutes
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        pageSize,
        search,
        category,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Use pageSize if provided, otherwise use limit
      const itemsPerPage = parseInt(pageSize || limit);
      const currentPage = parseInt(page);
      const skip = (currentPage - 1) * itemsPerPage;

      // Convert sort order
      const sortDirection = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;

      // Build query
      let query = { isActive: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
        ];
      }

      if (category) {
        query.category = { $regex: category, $options: "i" };
      }

      // Execute query with pagination
      const [watchfaces, totalCount] = await Promise.all([
        Watchface.find(query)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(itemsPerPage)
          .lean(),
        Watchface.countDocuments(query),
      ]);

      const metadata = buildResponseMetadata(
        watchfaces,
        totalCount,
        currentPage,
        itemsPerPage
      );

      res.json({
        success: true,
        data: watchfaces,
        meta: metadata,
      });
    } catch (error) {
      logger.error("Error fetching watchfaces:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch watchfaces",
      });
    }
  }
);

// GET /api/watchfaces/:id - Get single watchface by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format",
      });
    }

    const watchface = await Watchface.findById(id);

    if (!watchface) {
      return res.status(404).json({
        success: false,
        error: "Watchface not found",
      });
    }

    res.json({
      success: true,
      data: watchface,
    });
  } catch (error) {
    logger.error("Error fetching watchface:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch watchface",
    });
  }
});

// GET /api/watchfaces/categories - Get all available categories
router.get("/meta/categories", cache(3600), async (req, res) => {
  try {
    const categories = await Watchface.distinct("category", { isActive: true });

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Watchface.countDocuments({
          category,
          isActive: true,
        });
        return { name: category, count };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCount.sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    logger.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch categories",
    });
  }
});

// GET /api/watchfaces/stats - Get collection statistics
router.get("/meta/stats", cache(1800), async (req, res) => {
  try {
    const [totalCount, activeCount, categoriesCount, recentCount] =
      await Promise.all([
        Watchface.countDocuments(),
        Watchface.countDocuments({ isActive: true }),
        Watchface.distinct("category", { isActive: true }),
        Watchface.countDocuments({
          isActive: true,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]);

    const averageRating = await Watchface.aggregate([
      { $match: { isActive: true, rating: { $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);

    res.json({
      success: true,
      data: {
        totalWatchfaces: totalCount,
        activeWatchfaces: activeCount,
        totalCategories: categoriesCount.length,
        recentWatchfaces: recentCount,
        averageRating:
          averageRating.length > 0
            ? Math.round(averageRating[0].avgRating * 100) / 100
            : null,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch statistics",
    });
  }
});

// GET /api/watchfaces/search/advanced - Advanced search with multiple filters
router.get(
  "/search/advanced",
  validatePagination,
  validateSearch,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        minRating,
        maxRating,
        author,
        sortBy = "createdAt",
        sortOrder = "desc",
        hasRating,
        freeOnly,
      } = req.query;

      const itemsPerPage = parseInt(limit);
      const currentPage = parseInt(page);
      const skip = (currentPage - 1) * itemsPerPage;
      const sortDirection = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;

      // Build advanced query
      let query = { isActive: true };

      if (search) {
        query.$text = { $search: search };
      }

      if (category) {
        query.category = { $regex: category, $options: "i" };
      }

      if (author) {
        query.author = { $regex: author, $options: "i" };
      }

      if (minRating || maxRating) {
        query.rating = {};
        if (minRating) query.rating.$gte = parseFloat(minRating);
        if (maxRating) query.rating.$lte = parseFloat(maxRating);
      }

      if (hasRating === "true") {
        query.rating = { $ne: null, $exists: true };
      }

      if (freeOnly === "true") {
        query.$or = [
          { price: "Free" },
          { price: "0" },
          { price: { $exists: false } },
        ];
      }

      const [watchfaces, totalCount] = await Promise.all([
        Watchface.find(query)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(itemsPerPage)
          .lean(),
        Watchface.countDocuments(query),
      ]);

      const metadata = buildResponseMetadata(
        watchfaces,
        totalCount,
        currentPage,
        itemsPerPage
      );

      res.json({
        success: true,
        data: watchfaces,
        meta: metadata,
        query: {
          search,
          category,
          author,
          minRating,
          maxRating,
          hasRating,
          freeOnly,
        },
      });
    } catch (error) {
      logger.error("Error in advanced search:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Advanced search failed",
      });
    }
  }
);

module.exports = router;
