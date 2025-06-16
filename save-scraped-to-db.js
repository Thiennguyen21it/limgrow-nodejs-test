#!/usr/bin/env node

/**
 * Save Scraped Data to Database - Takes the JSON data and saves it to MongoDB
 */

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const Watchface = require("./src/models/Watchface");

const saveScrapedData = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB successfully!");

    // Load scraped data
    console.log("📂 Loading scraped data from JSON file...");
    const scrapedData = JSON.parse(
      fs.readFileSync("scraped-watchfaces.json", "utf8")
    );
    console.log(`Found ${scrapedData.length} watchfaces in JSON file`);

    // Remove duplicates by name
    const uniqueData = scrapedData.filter(
      (face, index, arr) => index === arr.findIndex((f) => f.name === face.name)
    );
    console.log(
      `After removing duplicates: ${uniqueData.length} unique watchfaces`
    );

    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log("💾 Saving watchfaces to database...\n");

    for (const [index, watchfaceData] of uniqueData.entries()) {
      try {
        console.log(
          `Processing ${index + 1}/${uniqueData.length}: ${watchfaceData.name}`
        );

        // Fix the date issue - convert empty object to proper date
        if (
          watchfaceData.metadata &&
          (!watchfaceData.metadata.scrapedAt ||
            typeof watchfaceData.metadata.scrapedAt === "object")
        ) {
          watchfaceData.metadata.scrapedAt = new Date();
        }

        // Ensure all required fields have proper values
        const cleanedData = {
          ...watchfaceData,
          name: watchfaceData.name || "Unknown",
          description: watchfaceData.description || "",
          category: watchfaceData.category || "General",
          imageUrl: watchfaceData.imageUrl || "",
          downloadUrl: watchfaceData.downloadUrl || "",
          price: watchfaceData.price || "Free",
          author: watchfaceData.author || "",
          rating: watchfaceData.rating || null,
          downloads: watchfaceData.downloads || 0,
          tags: Array.isArray(watchfaceData.tags) ? watchfaceData.tags : [],
          compatibility: Array.isArray(watchfaceData.compatibility)
            ? watchfaceData.compatibility
            : [],
          metadata: {
            ...watchfaceData.metadata,
            scrapedAt: new Date(),
            sourceUrl:
              watchfaceData.metadata?.sourceUrl ||
              "https://www.watchfacely.com/latest",
            originalId:
              watchfaceData.metadata?.originalId ||
              `fixed_${Date.now()}_${index}`,
          },
        };

        // Check if already exists
        const existing = await Watchface.findOne({
          name: cleanedData.name,
          imageUrl: cleanedData.imageUrl,
        });

        if (existing) {
          // Update existing
          Object.assign(existing, cleanedData);
          existing.metadata.scrapedAt = new Date();
          await existing.save();
          updatedCount++;
          console.log(`  ✅ Updated existing watchface`);
        } else {
          // Create new
          const watchface = new Watchface(cleanedData);
          await watchface.save();
          savedCount++;
          console.log(`  ✅ Saved new watchface`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error saving ${watchfaceData.name}:`);
        console.error(`     Error type: ${error.constructor.name}`);
        console.error(`     Error message: ${error.message}`);

        if (error.errors) {
          console.error("     Validation errors:");
          Object.keys(error.errors).forEach((key) => {
            console.error(`       ${key}: ${error.errors[key].message}`);
          });
        }
      }
    }

    console.log("\n📊 Final Results:");
    console.log(`   ✅ New watchfaces saved: ${savedCount}`);
    console.log(`   🔄 Existing watchfaces updated: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${uniqueData.length}`);

    // Verify data in database
    const totalInDb = await Watchface.countDocuments();
    console.log(`\n🗄️ Total watchfaces in database: ${totalInDb}`);
  } catch (error) {
    console.error("❌ Error during operation:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
};

// Run the save operation
saveScrapedData();
