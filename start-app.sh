#!/bin/bash

echo "==================================================="
echo "  Houseman Panel - Local Launcher for Mac & Linux"
echo "==================================================="
echo

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install NodeJS from https://nodejs.org/ before running this."
    exit 1
fi

# Ensure correct execution permissions on scripts if any
chmod +x "$0" 2>/dev/null

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "[INFO] First-time setup: Installing required software packages..."
    npm install
fi

echo "[INFO] Customizing the build..."
npm run build

echo
echo "[SUCCESS] Web service running!"
echo "---------------------------------------------------"
echo "  Local Address: http://localhost:3000"
echo "  Persistent Data Saved in: data.json"
echo
echo "  * KEEP THIS TERMINAL OPEN *"
echo "  To stop the server, close this window or press Ctrl+C"
echo "---------------------------------------------------"
echo

# Automatically open the web application in your default web browser
if command -v open &> /dev/null; then
    open "http://localhost:3000"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000"
fi

node dist/server.cjs
