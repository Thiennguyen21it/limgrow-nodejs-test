# Watchface Scraper API

A Node.js backend API for scraping and serving watch face data from watchfacely.com with comprehensive security and performance features.

## Features

- 🕷️ **Web Scraping**: Automated data collection from watchfacely.com
- 🗄️ **MongoDB Integration**: Structured data storage with MongoDB Atlas
- 🔒 **Security**: DoS protection, data encryption, input validation
- 📊 **API Endpoints**: RESTful API with pagination, filtering, and search
- ⚡ **Performance**: Caching, compression, and query optimization
- 📝 **Logging**: Comprehensive logging with Winston

## Quick Start

### Prerequisites

- Node.js 16+
- MongoDB Atlas account
- Git

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd watchface-scraper-api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI and other configurations

# Run scraper
npm run scrape

# Start server
npm start
```

## API Endpoints

### GET /api/watchfaces

Get watchfaces with pagination and filtering

```
Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)
- search: Search term
- category: Filter by category
- sortBy: Sort field (name, createdAt, rating, downloads)
- sortOrder: asc/desc
```

### GET /api/watchfaces/:id

Get single watchface by ID

### GET /api/watchfaces/meta/categories

Get all available categories

### GET /api/watchfaces/meta/stats

Get collection statistics

### GET /api/watchfaces/search/advanced

Advanced search with multiple filters

## Deployment

Ready for deployment on the provided server (103.56.162.99) with domain configuration.

## Security Features

- Rate limiting (DoS/DDoS protection)
- Input validation and sanitization
- MongoDB injection prevention
- Helmet security headers
- CORS configuration
- Request logging

## Performance Optimizations

- Response caching
- Gzip compression
- Database indexing
- Query optimization
- Connection pooling
