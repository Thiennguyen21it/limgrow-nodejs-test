// Simple in-memory cache middleware
const cache = (duration) => {
  const cache = new Map();

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      res.set("X-Cache", "HIT");
      return res.json(cachedResponse.data);
    }

    // Store original json function
    const originalJson = res.json;

    // Override json function to cache response
    res.json = function (data) {
      if (res.statusCode === 200) {
        cache.set(key, {
          data,
          expiry: Date.now() + duration * 1000,
        });
        res.set("X-Cache", "MISS");
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = cache;
