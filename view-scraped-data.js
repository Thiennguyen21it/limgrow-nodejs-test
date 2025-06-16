#!/usr/bin/env node

/**
 * View Scraped Data - Shows extracted watchface data without saving to database
 */

const puppeteer = require("puppeteer");
const util = require("util");

const viewScrapedData = async () => {
  console.log("🔍 Viewing Scraped Watchface Data...\n");

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1366, height: 768 });

  try {
    console.log("🌐 Navigating to https://www.watchfacely.com/latest...");

    await page.goto("https://www.watchfacely.com/latest", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    console.log("✅ Page loaded successfully!");

    // Extract watchface data using the same logic as the scraper
    const watchfaces = await page.evaluate((siteUrl) => {
      const results = [];

      // Strategy 1: Look for text-block-2 elements (watchface names) and find corresponding images
      const nameElements = document.querySelectorAll(".text-block-2");
      console.log(`Found ${nameElements.length} .text-block-2 elements`);

      nameElements.forEach((nameEl, index) => {
        try {
          const name = nameEl.textContent.trim();

          if (!name || name.length === 0) return;

          // Find the closest image - look in parent containers
          let imageUrl = "";
          let detailUrl = "";
          let author = "";
          let description = "";

          // Look for image in the same container or nearby
          const parentContainer = nameEl.closest("div, article, section");
          if (parentContainer) {
            const imgEl = parentContainer.querySelector("img");
            if (imgEl) {
              imageUrl =
                imgEl.src ||
                imgEl.dataset.src ||
                imgEl.getAttribute("data-src") ||
                "";
              if (imageUrl && imageUrl.startsWith("/")) {
                imageUrl = siteUrl + imageUrl;
              }
            }

            // Look for links in the same container
            const linkEl =
              parentContainer.querySelector('a[href*="/face/"]') ||
              parentContainer.querySelector("a");
            if (linkEl) {
              detailUrl = linkEl.href;
              if (detailUrl && detailUrl.startsWith("/")) {
                detailUrl = siteUrl + detailUrl;
              }
            }

            // Look for author information
            const authorEl = parentContainer.querySelector(
              '[class*="author"], [class*="composer"], [class*="by"]'
            );
            if (authorEl) {
              author = authorEl.textContent
                .trim()
                .replace(/^(composed by|by)\s*/i, "");
            }

            // Look for description
            const descEl = parentContainer.querySelector(
              'p, .description, [class*="desc"]'
            );
            if (descEl && descEl !== nameEl) {
              description = descEl.textContent.trim();
            }
          }

          // If no image found in container, look for the closest image before or after
          if (!imageUrl) {
            // Try to find image by index (assuming images and names are in same order)
            const allImages = document.querySelectorAll("img");
            if (allImages[index]) {
              const imgEl = allImages[index];
              imageUrl =
                imgEl.src ||
                imgEl.dataset.src ||
                imgEl.getAttribute("data-src") ||
                "";
              if (imageUrl && imageUrl.startsWith("/")) {
                imageUrl = siteUrl + imageUrl;
              }
            }
          }

          // Only add if we have both name and image
          if (name && imageUrl) {
            results.push({
              name: name.substring(0, 200),
              description: description.substring(0, 500),
              category: "General",
              imageUrl: imageUrl,
              downloadUrl: detailUrl || window.location.href,
              price: "Free",
              author: author.substring(0, 100),
              rating: null,
              downloads: 0,
              tags: [],
              metadata: {
                sourceUrl: window.location.href,
                originalId: `watchface_textblock2_${Date.now()}_${index}`,
                scrapedAt: new Date(),
              },
            });
          }
        } catch (itemError) {
          console.error("Error processing text-block-2 item:", itemError);
        }
      });

      console.log(`Extracted ${results.length} watchfaces`);
      return results;
    }, "https://www.watchfacely.com");

    console.log(
      `\n📊 Successfully extracted ${watchfaces.length} watchfaces!\n`
    );

    // Display the scraped data
    watchfaces.forEach((face, index) => {
      console.log(`\n🔸 Watchface ${index + 1}:`);
      console.log(`   Name: ${face.name}`);
      console.log(`   Category: ${face.category}`);
      console.log(`   Price: ${face.price}`);
      console.log(`   Author: ${face.author || "N/A"}`);
      console.log(`   Description: ${face.description || "N/A"}`);
      console.log(`   Image URL: ${face.imageUrl ? "Found" : "Missing"}`);
      console.log(`   Detail URL: ${face.downloadUrl ? "Found" : "Missing"}`);
      console.log(`   Original ID: ${face.metadata.originalId}`);

      if (index < 3) {
        // Show full URLs for first 3 items
        console.log(`   Full Image URL: ${face.imageUrl}`);
        console.log(`   Full Detail URL: ${face.downloadUrl}`);
      }
    });

    // Summary statistics
    console.log(`\n📈 Summary Statistics:`);
    console.log(`   Total watchfaces: ${watchfaces.length}`);
    console.log(
      `   With images: ${watchfaces.filter((f) => f.imageUrl).length}`
    );
    console.log(
      `   With detail URLs: ${
        watchfaces.filter(
          (f) => f.downloadUrl && f.downloadUrl.includes("/face/")
        ).length
      }`
    );
    console.log(
      `   With authors: ${watchfaces.filter((f) => f.author).length}`
    );
    console.log(
      `   With descriptions: ${watchfaces.filter((f) => f.description).length}`
    );

    // Save to JSON file for easy viewing
    const fs = require("fs");
    fs.writeFileSync(
      "scraped-watchfaces.json",
      JSON.stringify(watchfaces, null, 2)
    );
    console.log(`\n💾 Data saved to: scraped-watchfaces.json`);
    console.log(`\nTo view the JSON file:`);
    console.log(`   cat scraped-watchfaces.json | jq .`);
    console.log(`   # or`);
    console.log(
      `   node -p "JSON.stringify(require('./scraped-watchfaces.json'), null, 2)"`
    );
  } catch (error) {
    console.error("❌ Error during scraping:", error.message);
  } finally {
    await browser.close();
    console.log("\n🔌 Browser closed");
  }
};

// Run the viewer
viewScrapedData().catch(console.error);
