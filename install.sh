#!/bin/bash

# Exit on error
set -e

echo "================================================="
echo "Dell Monitor Brightness Sync - Setup Script"
echo "================================================="

# 1. Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install it first from https://brew.sh/"
    exit 1
fi

# 2. Check/Install m1ddc
if ! brew list m1ddc &> /dev/null; then
    echo "📦 Installing required dependency: m1ddc..."
    brew install m1ddc
else
    echo "✅ m1ddc is already installed."
fi

# 3. Check for Node & NPM
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js (https://nodejs.org/)"
    exit 1
fi

# 4. Install the package globally
echo "📦 Installing '@mkushka/dell-brightness-sync' globally via npm..."
npm install -g @mkushka/dell-brightness-sync

# 5. Setup PM2 for background running
echo "🚀 Setting up background daemon using pm2..."

# Ensure pm2 is available
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Stop existing instance if it exists
pm2 stop dell-brightness-sync &> /dev/null || true
pm2 delete dell-brightness-sync &> /dev/null || true

# Find the installed binary path
BINARY_PATH=$(command -v dell-brightness-sync)

if [ -z "$BINARY_PATH" ]; then
    echo "❌ Failed to locate the installed binary. Please check your npm global path configuration."
    exit 1
fi

# Start via PM2
pm2 start "$BINARY_PATH" --name "dell-brightness-sync"

# Setup PM2 Startup script
echo "🔧 Configuring PM2 to launch on system startup..."
echo "Note: This may ask for your password to install the launch agent."
pm2 startup | tail -n 1 | bash || true
pm2 save

echo ""
echo "================================================="
echo "✅ Setup Complete!"
echo "The brightness sync is now running in the background."
echo "You can view its status anytime using: pm2 status"
echo "You can view its logs anytime using: pm2 logs dell-brightness-sync"
echo "================================================="
