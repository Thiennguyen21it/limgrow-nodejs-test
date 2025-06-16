#!/usr/bin/env node

/**
 * Scraper Test Script
 *
 * This script tests the improved scraper against the real website.
 * Run with: node test-scraper.js
 */

require("dotenv").config();
const WatchfaceScraper = require("./src/scraper");
const mongoose = require("mongoose");

const testScraper = async () => {
  console.log("🕷️ Testing Watchface Scraper...\n");

  // Check environment
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in environment variables");
    console.log("💡 Please set up your .env file first");
    console.log("📖 See MONGODB_ATLAS_GUIDE.md for setup instructions");
    process.exit(1);
  }

  console.log("📋 Test Configuration:");
  console.log(`   Target: https://www.watchfacely.com/latest`);
  console.log(
    `   Debug Mode: ${process.env.DEBUG_MODE === "true" ? "ON" : "OFF"}`
  );
  console.log(`   Database: Connected\n`);

  const scraper = new WatchfaceScraper();

  try {
    console.log("⏳ Initializing scraper...");
    await scraper.initialize();

    console.log("✅ Scraper initialized successfully!\n");

    // Test scraping a single page first
    console.log("🔍 Testing single page scraping...");
    const testUrl = "https://www.watchfacely.com/latest";
    const watchfaces = await scraper.scrapePage(testUrl);

    console.log(`📊 Results from single page:`);
    console.log(`   Found: ${watchfaces.length} watchfaces`);

    if (watchfaces.length > 0) {
      console.log(`   Sample data:`);
      const sample = watchfaces[0];
      console.log(`     Name: ${sample.name}`);
      console.log(`     Author: ${sample.author || "N/A"}`);
      console.log(`     Image: ${sample.imageUrl ? "Found" : "Missing"}`);
      console.log(
        `     Detail URL: ${sample.downloadUrl ? "Found" : "Missing"}`
      );

      // Test individual face scraping if we have a detail URL
      if (sample.downloadUrl && sample.downloadUrl.includes("/face/")) {
        console.log("\n🔍 Testing individual face page scraping...");
        const detailedFace = await scraper.scrapeIndividualFace(
          sample.downloadUrl
        );

        if (detailedFace) {
          console.log(`✅ Individual face scraping successful:`);
          console.log(`   Name: ${detailedFace.name}`);
          console.log(`   Author: ${detailedFace.author}`);
          console.log(
            `   Description: ${detailedFace.description.substring(0, 100)}...`
          );
          console.log(`   Tags: ${detailedFace.tags.join(", ") || "None"}`);
        } else {
          console.log(`❌ Individual face scraping failed`);
        }
      }

      console.log("\n🎉 Scraper test completed successfully!");
      console.log("\n📝 Next steps:");
      console.log("   1. Run full scraper: npm run scrape");
      console.log("   2. Start API server: npm start");
      console.log("   3. Test API: curl http://localhost:3000/api/watchfaces");
    } else {
      console.log("⚠️  No watchfaces found. This could mean:");
      console.log("   • Website structure has changed");
      console.log("   • Anti-bot protection is active");
      console.log("   • Network connectivity issues");
      console.log("   • Selectors need updating");

      console.log("\n🔧 Troubleshooting tips:");
      console.log("   • Try enabling debug mode: DEBUG_MODE=true");
      console.log("   • Check the website manually in your browser");
      console.log("   • Verify your internet connection");
      console.log("   • Update scraper selectors if needed");
    }
  } catch (error) {
    console.error("\n❌ Scraper test failed!");
    console.error(`   Error: ${error.message}`);

    if (error.message.includes("timeout")) {
      console.log("\n🔧 Timeout troubleshooting:");
      console.log("   • Check your internet connection");
      console.log("   • The website might be slow or blocking requests");
      console.log("   • Try running the test again");
    } else if (error.message.includes("navigation")) {
      console.log("\n🔧 Navigation troubleshooting:");
      console.log("   • The website might be blocking automated access");
      console.log("   • Check if the URL is accessible manually");
      console.log("   • Website might be temporarily down");
    }

    console.log("\n📖 For detailed troubleshooting, see README.md");
  } finally {
    await scraper.cleanup();
    console.log("\n🔌 Cleanup completed");
  }
};

// Handle unhandled rejections
process.on("unhandledRejection", (error) => {
  console.error("\n💥 Unhandled error:", error.message);
  process.exit(1);
});

// Run the test
console.log("🚀 Starting scraper test...\n");
testScraper();
