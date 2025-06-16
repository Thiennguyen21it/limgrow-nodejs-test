#!/bin/bash

# Deployment script for watchface-scraper-api
# Usage: ./deploy.sh [domain]

DOMAIN=${1:-"test1.fuses.fun"}
SERVER_IP="103.56.162.99"
SERVER_USER="root"
SSH_PORT="24700"
APP_DIR="/var/www/$DOMAIN"

echo "🚀 Starting deployment to $DOMAIN..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
    print_warning "SSH key not found. Make sure you can connect to the server."
fi

print_status "Connecting to server and setting up application..."

# SSH into server and setup application
ssh -p $SSH_PORT $SERVER_USER@$SERVER_IP << EOF
    set -e
    
    echo "📦 Setting up application directory..."
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    echo "🔄 Installing Node.js and dependencies..."
    # Install Node.js if not exists
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2 if not exists
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    echo "📁 Creating application structure..."
    # Create basic structure if not exists
    mkdir -p src/{models,routes,middleware,utils} logs
    
    echo "✅ Server setup completed!"
EOF

print_status "Uploading application files..."

# Upload files to server
scp -P $SSH_PORT -r \
    package.json \
    src/ \
    $SERVER_USER@$SERVER_IP:$APP_DIR/

print_status "Installing dependencies and starting application..."

# Install dependencies and start app
ssh -p $SSH_PORT $SERVER_USER@$SERVER_IP << EOF
    set -e
    cd $APP_DIR
    
    echo "📦 Installing npm dependencies..."
    npm install --production
    
    echo "⚙️ Setting up environment..."
    # Create basic .env if not exists
    if [ ! -f .env ]; then
        cat > .env << EOL
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/watchface-db
LOG_LEVEL=info
EOL
        echo "⚠️  Please update .env file with your MongoDB URI"
    fi
    
    echo "🔄 Starting application with PM2..."
    pm2 delete watchface-api 2>/dev/null || true
    pm2 start src/app.js --name "watchface-api" --log logs/pm2.log
    pm2 save
    pm2 startup
    
    echo "🌐 Configuring Nginx..."
    # Create Nginx config
    cat > /etc/nginx/sites-available/$DOMAIN << EOL
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOL
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    
    echo "✅ Deployment completed!"
    echo "🌐 Application available at: http://$DOMAIN"
    echo "📊 API endpoint: http://$DOMAIN/api/watchfaces"
    echo "💡 Don't forget to update your .env file with proper MongoDB URI"
EOF

print_status "Deployment completed successfully! 🎉"
print_status "Your API is available at: http://$DOMAIN/api/watchfaces"
print_warning "Remember to:"
print_warning "1. Update .env file with your MongoDB Atlas URI"
print_warning "2. Run the scraper: ssh -p $SSH_PORT $SERVER_USER@$SERVER_IP 'cd $APP_DIR && npm run scrape'" 