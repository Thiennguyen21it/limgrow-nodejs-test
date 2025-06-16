# Environment Setup Guide

This guide explains how to configure the environment variables for the Watchface Scraper API.

## Quick Setup

1. **Copy the environment template:**

   ```bash
   cp env.example .env
   ```

2. **Edit the `.env` file with your actual values:**
   ```bash
   nano .env  # or use your preferred editor
   ```

## Required Configuration

### 🔗 MongoDB Connection (REQUIRED)

```env
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/watchface-db?retryWrites=true&w=majority
```

- Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas/register
- Create a new cluster and database
- Get your connection string from Atlas dashboard
- Replace `your-username`, `your-password`, and `your-cluster` with actual values

### 🔒 Security (RECOMMENDED)

```env
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
```

- Generate a strong, random secret key for JWT tokens
- Use at least 32 characters with mixed case, numbers, and symbols

### 🌐 CORS (RECOMMENDED)

```env
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com,https://test1.fuses.fun
```

- Add your frontend domain(s)
- For development, include `http://localhost:3000`
- For production, add your actual domain

## Optional Configuration

### 📊 Server Settings

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### 🛡️ Rate Limiting

- `RATE_LIMIT_MAX_REQUESTS`: General rate limit (default: 100 per 15 minutes)
- `API_RATE_LIMIT_MAX`: API endpoint rate limit (default: 20 per 15 minutes)

### 📝 Logging

- `LOG_LEVEL`: Logging level (error, warn, info, debug)

### 🕷️ Scraper Settings

- `MAX_PAGES_TO_SCRAPE`: Maximum pages to scrape (default: 5)
- `SCRAPER_DELAY`: Delay between requests in ms (default: 1000)
- `BROWSER_TIMEOUT`: Browser timeout in ms (default: 30000)

### ⚡ Performance

- `CACHE_DURATION`: Response cache duration in seconds (default: 300)
- `DEFAULT_PAGE_SIZE`: Default pagination size (default: 20)
- `MAX_PAGE_SIZE`: Maximum pagination size (default: 100)

## Testing Your Configuration

1. **Test MongoDB connection:**

   ```bash
   npm run test:db  # If you have this script
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Test the health endpoint:**

   ```bash
   curl http://localhost:3000/health
   ```

4. **Run the scraper:**
   ```bash
   npm run scrape
   ```

## Production Deployment

For production deployment, make sure to:

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper `ALLOWED_ORIGINS`
4. Set appropriate rate limits
5. Use `LOG_LEVEL=info` or `warn`

## Troubleshooting

### MongoDB Connection Issues

- Verify your connection string format
- Check network access settings in MongoDB Atlas
- Ensure your IP is whitelisted
- Verify username/password credentials

### Rate Limiting Issues

- Increase rate limits for development
- Check your IP isn't being blocked
- Verify rate limit configuration

### Scraper Issues

- Check if the target website is accessible
- Increase `BROWSER_TIMEOUT` if pages load slowly
- Adjust `SCRAPER_DELAY` to be more respectful to the target site

## Security Notes

⚠️ **Never commit your `.env` file to version control!**

The `.env` file contains sensitive information and should be kept private. The `.gitignore` file is already configured to exclude it.

For production deployments, use your hosting provider's environment variable configuration instead of a `.env` file when possible.
