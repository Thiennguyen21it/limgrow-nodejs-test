const WatchfaceScraper = require("../src/scraper");
const logger = require("../src/utils/logger");

async function testImprovedScraper() {
  const scraper = new WatchfaceScraper();

  try {
    console.log("🚀 Testing improved scraper with specific selectors...");

    // Initialize the scraper
    await scraper.initialize();

    // Test scraping the main page
    console.log("📄 Scraping main page...");
    const mainPageData = await scraper.scrapePage(scraper.baseUrl);
    console.log(`✅ Found ${mainPageData.length} watchfaces on main page`);

    // Show sample data from main page
    if (mainPageData.length > 0) {
      console.log("\n📋 Sample watchface from main page:");
      const sample = mainPageData[0];
      console.log(`Name: ${sample.name}`);
      console.log(`Author: ${sample.author}`);
      console.log(`Image URL: ${sample.imageUrl}`);
      console.log(`Detail URL: ${sample.downloadUrl}`);
      console.log(`Face ID: ${sample.metadata.faceId}`);
    }

    // Test scraping individual faces (limit to 2 for testing)
    const facesToTest = mainPageData
      .filter((face) => face.downloadUrl && face.downloadUrl.includes("/face/"))
      .slice(0, 2);

    console.log(
      `\n🔍 Testing individual face scraping for ${facesToTest.length} faces...`
    );

    for (const face of facesToTest) {
      console.log(`\n🎯 Scraping: ${face.downloadUrl}`);
      const detailedData = await scraper.scrapeIndividualFace(face.downloadUrl);

      if (detailedData) {
        console.log(`✅ Successfully scraped detailed data:`);
        console.log(`  Name: ${detailedData.name}`);
        console.log(`  Author: ${detailedData.author}`);
        console.log(
          `  Description: ${detailedData.description.substring(0, 100)}...`
        );
        console.log(`  Face ID: ${detailedData.metadata.faceId}`);
        console.log(`  Tags: ${detailedData.tags.join(", ")}`);
      } else {
        console.log(`❌ Failed to scrape detailed data`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await scraper.cleanup();
  }
}

// Run the test
if (require.main === module) {
  testImprovedScraper()
    .then(() => {
      console.log("\n🎉 Test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}

module.exports = testImprovedScraper;
