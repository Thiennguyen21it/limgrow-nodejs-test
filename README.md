# Watchface Scraper API

A Node.js API for scraping and serving Apple Watch face data from [watchfacely.com](https://www.watchfacely.com). This project provides a RESTful API to access watch face information including images, metadata, and detailed face information.

![API Status](https://img.shields.io/badge/API-Active-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## 🚀 Features

- **Web Scraping**: Automated scraping of watch faces from watchfacely.com
- **RESTful API**: Clean, paginated API endpoints
- **Face Metadata**: Extracts face IDs, names, authors, and images
- **Search & Filter**: Advanced search and filtering capabilities
- **Caching**: Built-in response caching for better performance
- **Security**: Rate limiting, CORS, and security headers
- **Monitoring**: Health checks and comprehensive logging

## 📁 Project Structure

```
limgrow-test/
├── src/
│   ├── app.js              # Express server setup
│   ├── scraper.js          # Main scraper class
│   ├── models/
│   │   └── Watchface.js    # MongoDB model
│   ├── routes/
│   │   └── watchfaces.js   # API routes
│   ├── middleware/
│   └── utils/
│       └── logger.js       # Winston logger
├── test/                   # Test files and utilities
│   ├── test-scraper.js
│   ├── test-improved-scraper.js
│   ├── save-scraped-to-db.js
│   ├── view-scraped-data.js
│   └── scraped-watchfaces.json
├── logs/                   # Log files
├── .env                    # Environment variables
├── package.json
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd limgrow-test
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   ```

4. **Start the server**

   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Run the scraper** (optional)
   ```bash
   npm run scrape
   ```

## 🔧 Configuration

Key environment variables in `.env`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/watchface-db
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

For a complete list of all configuration options with detailed explanations, see **[ENV_TEMPLATE.md](ENV_TEMPLATE.md)**.

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### 🎯 Main Endpoints

#### Get All Watchfaces

```http
GET /api/watchfaces
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search in name, description, author
- `category` (string): Filter by category
- `sortBy` (string): Sort field (name, createdAt, updatedAt, rating, downloads)
- `sortOrder` (string): Sort direction (asc, desc)

**Example:**

```bash
curl "http://localhost:3000/api/watchfaces?page=1&limit=5&search=golden"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Golden transmitters",
      "description": "",
      "category": "General",
      "imageUrl": "https://assets.watchfacely.com/watchfaces/.../snapshot.png",
      "downloadUrl": "https://www.watchfacely.com/face/166196229151333",
      "price": "Free",
      "author": "",
      "rating": null,
      "downloads": 0,
      "tags": [],
      "compatibility": [],
      "isActive": true,
      "metadata": {
        "sourceUrl": "https://www.watchfacely.com/latest",
        "originalId": "face_166196229151333",
        "faceId": "166196229151333",
        "scrapedAt": "2025-06-16T05:20:29.668Z"
      },
      "createdAt": "2025-06-16T03:13:53.087Z",
      "updatedAt": "2025-06-16T05:20:29.670Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 8,
      "limit": 5,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextPage": 2,
      "prevPage": null
    },
    "resultsCount": 5
  }
}
```

#### Get Single Watchface

```http
GET /api/watchfaces/:id
```

**Example:**

```bash
curl "http://localhost:3000/api/watchfaces/684f8bf1b0831130e8791150"
```

#### Get Categories

```http
GET /api/watchfaces/meta/categories
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "General",
      "count": 16
    }
  ]
}
```

#### Get Statistics

```http
GET /api/watchfaces/meta/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalWatchfaces": 16,
    "activeWatchfaces": 16,
    "totalCategories": 1,
    "recentWatchfaces": 16,
    "averageRating": null,
    "lastUpdated": "2025-06-16T05:22:31.972Z"
  }
}
```

#### Advanced Search

```http
GET /api/watchfaces/search/advanced
```

**Query Parameters:**

- All basic parameters plus:
- `minRating`, `maxRating` (number): Rating range
- `author` (string): Filter by author
- `hasRating` (boolean): Only faces with ratings
- `freeOnly` (boolean): Only free faces

### 🔍 Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-06-16T05:22:31.972Z",
  "uptime": 1234.567
}
```

## 🧪 Testing

Run different test suites:

```bash
# Test the scraper
npm run test:scraper

# Test improved scraper with specific selectors
npm run test:improved-scraper

# Test database operations
npm run test:db

# View scraped data
npm run test:view

# Run all tests
npm test
```

## 🤖 Scraper Details

The scraper extracts watchface data using specific CSS selectors:

- **Face Names**: `.text-block-2` and `.heading-3` classes
- **Authors**: `.author_name` class
- **Images**: Looks for `snapshot.png` from `assets.watchfacely.com`
- **Face IDs**: Extracted from URLs like `/face/166196229151333`
- **Individual Pages**: Constructs URLs like `https://www.watchfacely.com/face/{faceId}`

### Scraper Features

- **Retry Logic**: 3 retry attempts with exponential backoff
- **Rate Limiting**: 2-second delays between requests
- **Duplicate Detection**: Based on name and image URL
- **Error Handling**: Comprehensive error logging
- **Browser Stealth**: Anti-detection measures

## 📊 Data Model

```javascript
{
  name: String,          // Watchface name
  description: String,   // Description text
  category: String,      // Category (General, etc.)
  imageUrl: String,      // Image URL
  downloadUrl: String,   // Individual face page URL
  price: String,         // Price (usually "Free")
  author: String,        // Author name
  rating: Number,        // Rating (0-5)
  downloads: Number,     // Download count
  tags: [String],        // Tag array
  compatibility: [String], // Compatible apps
  isActive: Boolean,     // Active status
  metadata: {
    sourceUrl: String,   // Source page URL
    originalId: String,  // Unique identifier
    faceId: String,      // Face ID from URL
    scrapedAt: Date      // Scrape timestamp
  }
}
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **CORS**: Configurable origins
- **Helmet**: Security headers
- **Input Validation**: Request parameter validation
- **MongoDB Sanitization**: NoSQL injection prevention
- **HPP**: HTTP Parameter Pollution protection

## 📈 Performance

- **Caching**: 5-minute cache on main endpoints
- **Pagination**: Efficient data loading
- **Database Indexing**: Optimized queries
- **Compression**: gzip compression enabled
- **Connection Pooling**: MongoDB connection optimization

## 🚀 Deployment

The project includes a **secure** deployment script with comprehensive security measures:

```bash
./deploy.sh yourdomain.com
```

### 🔒 Security Features

- **HTTPS Enforced**: Automatic SSL certificate with Let's Encrypt
- **Dedicated User**: Runs as non-root `watchface` user
- **Firewall**: UFW configured with minimal open ports
- **Fail2Ban**: Automatic IP blocking for failed attempts
- **Rate Limiting**: API and request rate limiting via nginx
- **Security Headers**: HSTS, CSP, XSS protection, and more
- **File Permissions**: Proper 644/755/600 permissions
- **Process Isolation**: Systemd security sandbox

### Manual Deployment Steps

For manual deployment with security:

1. **Create dedicated user**:

   ```bash
   sudo adduser watchface
   sudo usermod -aG sudo watchface
   ```

2. **Setup SSH keys**:

   ```bash
   ssh-copy-id -p 24700 watchface@your-server
   ```

3. **Run secure deployment**:

   ```bash
   ./deploy.sh yourdomain.com
   ```

4. **Verify security**:

   ```bash
   # Test HTTPS redirect
   curl -I http://yourdomain.com

   # Check security headers
   curl -I https://yourdomain.com

   # Verify SSL certificate
   openssl s_client -connect yourdomain.com:443
   ```

For detailed security information, see [SECURITY.md](SECURITY.md).

## 🔒 Security

This project implements enterprise-grade security measures:

- **🛡️ Server Hardening**: Firewall, fail2ban, secure SSH
- **🔐 SSL/TLS**: HTTPS enforced with modern TLS protocols
- **⚡ Rate Limiting**: API and request throttling
- **🚫 Input Validation**: Prevention of injection attacks
- **📊 Monitoring**: Comprehensive logging and health checks
- **🔄 Auto-Updates**: SSL certificate auto-renewal

See [SECURITY.md](SECURITY.md) for complete security documentation.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Check `MONGODB_URI` in `.env`
   - Verify network access to MongoDB Atlas

2. **Scraper Not Finding Data**

   - Website structure may have changed
   - Check CSS selectors in scraper code

3. **Rate Limiting**
   - Reduce scraping frequency
   - Check IP restrictions

### Debug Mode

Enable debug mode for troubleshooting:

```env
DEBUG_MODE=true
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Watchfacely.com](https://www.watchfacely.com) - Source website
- [MongoDB Atlas](https://www.mongodb.com/atlas) - Database hosting
- [Express.js](https://expressjs.com/) - Web framework
- [Puppeteer](https://pptr.dev/) - Web scraping

---

**Note**: This project is for educational purposes and respects the robots.txt and terms of service of the source website.
