#!/bin/bash
# Installation script for Geo Profile Dashboard
# This script automates the deployment of the geo-profile-dashboard application on a VPS
# Usage: bash install.sh [deployment_path]

set -e

# Default deployment path
DEPLOY_PATH=${1:-/var/www/geo-profile-dashboard}
LOG_FILE=/var/log/schedule-executor.log
APP_NAME="geo-profile-app"

# Display banner
echo "==============================================="
echo "  Geo Profile Dashboard Installation Script    "
echo "==============================================="
echo "Deployment path: $DEPLOY_PATH"
echo

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 
   exit 1
fi

# Check system requirements
echo "Checking system requirements..."
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required but not installed. Aborting."; exit 1; }

# Display versions
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo "git version: $(git --version)"

# Check if PM2 is installed globally
if ! command -v pm2 >/dev/null 2>&1; then
    echo "Installing PM2 globally..."
    npm install -g pm2
fi

# Create deployment directory if it doesn't exist
if [ ! -d "$DEPLOY_PATH" ]; then
    echo "Creating deployment directory: $DEPLOY_PATH"
    mkdir -p "$DEPLOY_PATH"
fi

# Clone or update repository
if [ -d "$DEPLOY_PATH/.git" ]; then
    echo "Repository already exists. Updating..."
    cd "$DEPLOY_PATH"
    git pull
else
    echo "Cloning repository..."
    # Replace this with your actual repo URL
    read -p "Enter the git repository URL: " REPO_URL
    git clone "$REPO_URL" "$DEPLOY_PATH"
    cd "$DEPLOY_PATH"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Set up environment file if it doesn't exist
if [ ! -f "$DEPLOY_PATH/.env" ]; then
    echo "Setting up environment file..."
    cp "$DEPLOY_PATH/.env.template" "$DEPLOY_PATH/.env"
    
    # Prompt for environment variables
    read -p "Enter Supabase URL: " SUPABASE_URL
    read -p "Enter Supabase Service Role Key: " SUPABASE_KEY
    read -p "Enter SimpleMDM API Key: " SIMPLEMDM_KEY
    
    # Generate random API key for schedule executor
    EXECUTOR_API_KEY=$(openssl rand -hex 16)
    
    # Update .env file
    sed -i "s|your_supabase_url|$SUPABASE_URL|g" "$DEPLOY_PATH/.env"
    sed -i "s|your_supabase_service_role_key|$SUPABASE_KEY|g" "$DEPLOY_PATH/.env"
    sed -i "s|your_simplemdm_api_key|$SIMPLEMDM_KEY|g" "$DEPLOY_PATH/.env"
    sed -i "s|your_secure_api_key_here|$EXECUTOR_API_KEY|g" "$DEPLOY_PATH/.env"
    
    # Add deployment path to .env
    echo "" >> "$DEPLOY_PATH/.env"
    echo "# Auto-configured by install script" >> "$DEPLOY_PATH/.env"
    echo "APP_DIR=$DEPLOY_PATH" >> "$DEPLOY_PATH/.env"
    
    # Set proper permissions on .env file
    chmod 600 "$DEPLOY_PATH/.env"
fi

# Build the application
echo "Building application..."
npm run build

# Make scripts executable
echo "Setting execution permissions..."
chmod +x "$DEPLOY_PATH/run-scheduler.sh"
chmod +x "$DEPLOY_PATH/scripts/executor.js"

# Set up log file
echo "Setting up log file..."
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Set up PM2
echo "Setting up PM2..."
pm2 start "$DEPLOY_PATH/ecosystem.config.cjs"
pm2 save
pm2 startup | tail -n 1 | bash

# Set up cron job
echo "Setting up cron job..."
(crontab -l 2>/dev/null || echo "") | grep -v "$DEPLOY_PATH/run-scheduler.sh" | { cat; echo "*/5 * * * * $DEPLOY_PATH/run-scheduler.sh"; } | crontab -

# Set up log rotation
echo "Setting up log rotation..."
cat > /etc/logrotate.d/geo-profile-dashboard << EOL
$LOG_FILE {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOL

# Display final instructions
echo
echo "==============================================="
echo "  Installation Complete!                       "
echo "==============================================="
echo
echo "Geo Profile Dashboard has been installed to: $DEPLOY_PATH"
echo
echo "Next steps:"
echo "1. Verify the application is running:"
echo "   - pm2 status"
echo "   - curl http://localhost:3000"
echo
echo "2. Set up Cloudflare Tunnel by following instructions in:"
echo "   $DEPLOY_PATH/DEPLOYMENT.md"
echo
echo "3. Test the scheduler execution:"
echo "   - $DEPLOY_PATH/run-scheduler.sh"
echo "   - tail -f $LOG_FILE"
echo
echo "For more information, see the documentation files:"
echo "- DEPLOYMENT.md - Complete deployment guide"
echo "- CRON_SETUP.md - Details on cron job configuration"
echo "- MONITORING.md - Monitoring and maintenance guide"
echo "- DEPLOYMENT_CHECKLIST.md - Step-by-step checklist"
echo
echo "Thank you for installing Geo Profile Dashboard!"
