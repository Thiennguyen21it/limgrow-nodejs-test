const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Watchface = require("./models/Watchface");
const logger = require("./utils/logger");

dotenv.config();

class WatchfaceScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = "https://www.watchfacely.com/latest";
    this.siteUrl = "https://www.watchfacely.com";
  }

  async initialize() {
    try {
      logger.info("Initializing scraper...");

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info("Connected to MongoDB");

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      });

      this.page = await this.browser.newPage();

      // Set user agent to avoid detection
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Set viewport
      await this.page.setViewport({ width: 1366, height: 768 });

      // Set extra headers
      await this.page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      logger.info("Scraper initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize scraper:", error);
      throw error;
    }
  }

  async scrapePage(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Scraping page: ${url} (attempt ${attempt})`);

        await this.page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Wait for the specific content to load
        try {
          await this.page.waitForSelector(".text-block-2, img", {
            timeout: 15000,
          });
        } catch (e) {
          logger.warn(
            "No .text-block-2 or img elements found, trying general approach..."
          );
        }

        // Take a screenshot for debugging
        if (process.env.DEBUG_MODE === "true") {
          await this.page.screenshot({ path: `debug-${Date.now()}.png` });
        }

        // Extract watchface data using the specific selectors identified
        const watchfaces = await this.page.evaluate((siteUrl) => {
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

                // Look for links in the same container that contain face IDs
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
                  '.author_name, [class*="author"], [class*="composer"], [class*="by"]'
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

              // Extract face ID from detail URL or image URL
              let faceId = null;
              if (detailUrl) {
                const faceIdMatch = detailUrl.match(/\/face\/(\d+)/);
                faceId = faceIdMatch ? faceIdMatch[1] : null;
              } else if (imageUrl) {
                const imageIdMatch = imageUrl.match(/watchfaces\/[^/]+\/(\d+)/);
                faceId = imageIdMatch ? imageIdMatch[1] : null;
                if (faceId) {
                  detailUrl = `${siteUrl}/face/${faceId}`;
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
                    originalId: faceId
                      ? `face_${faceId}`
                      : `watchface_textblock2_${Date.now()}_${index}`,
                    faceId: faceId,
                    scrapedAt: new Date(),
                  },
                });
              }
            } catch (itemError) {
              console.error("Error processing text-block-2 item:", itemError);
            }
          });

          // Strategy 2: If Strategy 1 didn't work well, try image-based approach
          if (results.length === 0) {
            console.log(
              "No results from text-block-2 strategy, trying image-based approach..."
            );

            const images = document.querySelectorAll("img");
            console.log(`Found ${images.length} images`);

            images.forEach((imgEl, index) => {
              try {
                let imageUrl =
                  imgEl.src ||
                  imgEl.dataset.src ||
                  imgEl.getAttribute("data-src") ||
                  "";

                // Skip small images, icons, logos
                if (imgEl.width < 50 || imgEl.height < 50) return;
                if (imageUrl.includes("logo") || imageUrl.includes("icon"))
                  return;

                if (imageUrl && imageUrl.startsWith("/")) {
                  imageUrl = siteUrl + imageUrl;
                }

                if (!imageUrl) return;

                // Look for name near the image
                let name = "";
                const parentContainer = imgEl.closest("div, article, section");
                if (parentContainer) {
                  // Look for text-block-2 first
                  const nameEl = parentContainer.querySelector(".text-block-2");
                  if (nameEl) {
                    name = nameEl.textContent.trim();
                  } else {
                    // Look for other text elements
                    const textElements = parentContainer.querySelectorAll(
                      'h1, h2, h3, h4, h5, .title, [class*="name"], .heading-3'
                    );
                    for (const textEl of textElements) {
                      const text = textEl.textContent.trim();
                      if (text && text.length > 0 && text.length < 100) {
                        name = text;
                        break;
                      }
                    }
                  }
                }

                if (!name) {
                  name = `Watch Face ${index + 1}`;
                }

                // Look for detail URL
                let detailUrl = "";
                if (parentContainer) {
                  const linkEl =
                    parentContainer.querySelector('a[href*="/face/"]') ||
                    parentContainer.querySelector("a");
                  if (linkEl) {
                    detailUrl = linkEl.href;
                    if (detailUrl && detailUrl.startsWith("/")) {
                      detailUrl = siteUrl + detailUrl;
                    }
                  }
                }

                // Extract face ID from detail URL or image URL
                let faceId = null;
                if (detailUrl) {
                  const faceIdMatch = detailUrl.match(/\/face\/(\d+)/);
                  faceId = faceIdMatch ? faceIdMatch[1] : null;
                } else if (imageUrl) {
                  const imageIdMatch = imageUrl.match(
                    /watchfaces\/[^/]+\/(\d+)/
                  );
                  faceId = imageIdMatch ? imageIdMatch[1] : null;
                  if (faceId) {
                    detailUrl = `${siteUrl}/face/${faceId}`;
                  }
                }

                results.push({
                  name: name.substring(0, 200),
                  description: "",
                  category: "General",
                  imageUrl: imageUrl,
                  downloadUrl: detailUrl || window.location.href,
                  price: "Free",
                  author: "",
                  rating: null,
                  downloads: 0,
                  tags: [],
                  metadata: {
                    sourceUrl: window.location.href,
                    originalId: faceId
                      ? `face_${faceId}`
                      : `watchface_img_${Date.now()}_${index}`,
                    faceId: faceId,
                    scrapedAt: new Date(),
                  },
                });
              } catch (itemError) {
                console.error("Error processing image item:", itemError);
              }
            });
          }

          console.log(`Extracted ${results.length} watchfaces`);
          return results;
        }, this.siteUrl);

        logger.info(`Extracted ${watchfaces.length} watchfaces from ${url}`);
        return watchfaces;
      } catch (error) {
        logger.error(`Attempt ${attempt} failed for ${url}:`, error.message);
        if (attempt === retries) {
          // Try to get page content for debugging
          try {
            const content = await this.page.content();
            const title = await this.page.title();
            logger.error(`Page title: ${title}`);
            logger.error(`Page content length: ${content.length}`);

            // Check if we're blocked
            if (
              content.includes("blocked") ||
              content.includes("403") ||
              content.includes("cloudflare")
            ) {
              logger.error(
                "Detected potential blocking or anti-bot protection"
              );
            }
          } catch (debugError) {
            logger.error("Could not get debug info:", debugError.message);
          }
          throw error;
        }

        // Wait longer between retries
        await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
      }
    }
  }

  async scrapeIndividualFace(faceUrl) {
    try {
      logger.info(`Scraping individual face: ${faceUrl}`);

      await this.page.goto(faceUrl, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      const faceData = await this.page.evaluate((siteUrl) => {
        try {
          // Extract detailed information from individual face page using specific selectors

          // Get watchface name from heading-3 class
          const nameEl = document.querySelector(".heading-3");
          const name = nameEl?.textContent?.trim() || "";

          // Get author from author_name class
          const authorEl = document.querySelector(".author_name");
          const author = authorEl?.textContent?.trim() || "";

          // Get image URL from img tag (look for snapshot.png or other watchface images)
          const imageEl = document.querySelector(
            'img[src*="snapshot.png"], img[src*="watchfaces"], img[src*="assets.watchfacely.com"]'
          );
          let imageUrl = "";
          if (imageEl) {
            imageUrl = imageEl.src;
            // Ensure absolute URL
            if (imageUrl.startsWith("/")) {
              imageUrl = siteUrl + imageUrl;
            }
          }

          // Get description from common description areas
          const descriptionEl = document.querySelector(
            'p, .description, [class*="desc"], .text-block'
          );
          const description = descriptionEl?.textContent?.trim() || "";

          // Look for app compatibility information
          const appsSection = document.querySelector(
            '[class*="apps"], [class*="Apps"], [class*="compatibility"]'
          );
          const apps = appsSection
            ? Array.from(appsSection.querySelectorAll("*"))
                .map((el) => el.textContent.trim())
                .filter(Boolean)
            : [];

          // Extract face ID from URL for better tracking
          const faceIdMatch = window.location.href.match(/\/face\/(\d+)/);
          const faceId = faceIdMatch ? faceIdMatch[1] : null;

          return {
            name: name.substring(0, 200),
            description: description.substring(0, 500),
            category: "General",
            imageUrl,
            downloadUrl: window.location.href,
            price: "Free",
            author: author.substring(0, 100),
            rating: null,
            downloads: 0,
            tags: apps.slice(0, 10), // Use apps as tags
            compatibility: apps,
            metadata: {
              sourceUrl: window.location.href,
              originalId: faceId
                ? `face_${faceId}`
                : `individual_${Date.now()}`,
              faceId: faceId,
              scrapedAt: new Date(),
            },
          };
        } catch (error) {
          console.error("Error extracting face data:", error);
          return null;
        }
      }, this.siteUrl);

      return faceData;
    } catch (error) {
      logger.error(
        `Failed to scrape individual face ${faceUrl}:`,
        error.message
      );
      return null;
    }
  }

  async scrapeAdditionalPages(maxPages = 3) {
    const allWatchfaces = [];

    try {
      // First scrape the main page
      const mainPageWatchfaces = await this.scrapePage(this.baseUrl);
      allWatchfaces.push(...mainPageWatchfaces);

      // Try to find and scrape individual face pages for more detailed info
      const faceUrls = mainPageWatchfaces
        .map((face) => face.downloadUrl)
        .filter((url) => url && url.includes("/face/"))
        .slice(0, 5); // Limit to first 5 for detailed scraping

      logger.info(
        `Found ${faceUrls.length} individual face URLs for detailed scraping`
      );

      // Scrape individual faces for more details
      for (const faceUrl of faceUrls) {
        try {
          const detailedFace = await this.scrapeIndividualFace(faceUrl);
          if (detailedFace) {
            // Update the corresponding face in allWatchfaces
            const index = allWatchfaces.findIndex(
              (face) => face.downloadUrl === faceUrl
            );
            if (index !== -1) {
              allWatchfaces[index] = {
                ...allWatchfaces[index],
                ...detailedFace,
              };
            }
          }
          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error(
            `Failed to scrape detailed face ${faceUrl}:`,
            error.message
          );
        }
      }

      // Try to find pagination and scrape additional pages
      await this.page.goto(this.baseUrl, { waitUntil: "networkidle0" });

      const paginationLinks = await this.page.evaluate(() => {
        const links = [];
        const pageSelectors = [
          'a[href*="page"]',
          ".pagination a",
          ".next",
          ".page-numbers a",
          'a:contains("Next")',
          'a:contains("More")',
        ];

        for (const selector of pageSelectors) {
          const pageLinks = document.querySelectorAll(selector);
          pageLinks.forEach((link) => {
            const href = link.href;
            if (
              href &&
              (href.includes("page") ||
                href.includes("latest") ||
                link.textContent.toLowerCase().includes("next"))
            ) {
              links.push(href);
            }
          });
        }

        return [...new Set(links)].slice(0, 5); // Get unique links, max 5
      });

      logger.info(`Found ${paginationLinks.length} pagination links`);

      // Scrape additional pages
      for (const link of paginationLinks.slice(0, maxPages - 1)) {
        try {
          const pageWatchfaces = await this.scrapePage(link);
          allWatchfaces.push(...pageWatchfaces);
          // Rate limiting between pages
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error(`Failed to scrape page ${link}:`, error.message);
        }
      }
    } catch (error) {
      logger.error("Error during additional page scraping:", error.message);
    }

    // Remove duplicates based on name and imageUrl
    const uniqueWatchfaces = allWatchfaces.filter(
      (face, index, arr) =>
        index ===
        arr.findIndex(
          (f) => f.name === face.name && f.imageUrl === face.imageUrl
        )
    );

    logger.info(`Total unique watchfaces found: ${uniqueWatchfaces.length}`);
    return uniqueWatchfaces;
  }

  async saveToDatabase(watchfaces) {
    try {
      logger.info(`Saving ${watchfaces.length} watchfaces to database...`);

      let savedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const watchfaceData of watchfaces) {
        try {
          // Skip if missing essential data
          if (!watchfaceData.name || !watchfaceData.imageUrl) {
            skippedCount++;
            continue;
          }

          // Check if watchface already exists
          const existingWatchface = await Watchface.findOne({
            $or: [
              { name: watchfaceData.name, imageUrl: watchfaceData.imageUrl },
              { "metadata.originalId": watchfaceData.metadata.originalId },
            ],
          });

          if (existingWatchface) {
            // Update existing watchface
            Object.assign(existingWatchface, watchfaceData);
            existingWatchface.metadata.scrapedAt = new Date();
            await existingWatchface.save();
            updatedCount++;
          } else {
            // Create new watchface
            const watchface = new Watchface(watchfaceData);
            await watchface.save();
            savedCount++;
          }
        } catch (error) {
          logger.error(
            `Error saving watchface ${watchfaceData.name}:`,
            error.message
          );
          skippedCount++;
        }
      }

      logger.info(
        `Database operation completed: ${savedCount} new, ${updatedCount} updated, ${skippedCount} skipped`
      );
      return {
        saved: savedCount,
        updated: updatedCount,
        skipped: skippedCount,
      };
    } catch (error) {
      logger.error("Error saving to database:", error);
      throw error;
    }
  }

  async run() {
    try {
      await this.initialize();

      logger.info("Starting watchface scraping...");
      const watchfaces = await this.scrapeAdditionalPages(3);

      if (watchfaces.length === 0) {
        logger.warn(
          "No watchfaces found - the website structure might have changed or be protected"
        );

        // Try to get page content for debugging
        try {
          await this.page.goto(this.baseUrl);
          const title = await this.page.title();
          const content = await this.page.content();
          logger.info(`Page title: ${title}`);
          logger.info(`Page content preview: ${content.substring(0, 500)}...`);
        } catch (debugError) {
          logger.error("Could not get debug info:", debugError.message);
        }
        return;
      }

      const result = await this.saveToDatabase(watchfaces);
      logger.info(`Scraping completed successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error("Scraping failed:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info("Browser closed");
      }

      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
      }
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}

// Run scraper if called directly
if (require.main === module) {
  const scraper = new WatchfaceScraper();
  scraper
    .run()
    .then(() => {
      logger.info("Scraper finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Scraper failed:", error);
      process.exit(1);
    });
}

module.exports = WatchfaceScraper;
