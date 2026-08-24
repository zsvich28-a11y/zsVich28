@echo off
echo ===================================================
echo   Houseman Panel - Local Launcher for Windows
echo ===================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install NodeJS from https://nodejs.org/ before running this.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not, perform install
if not exist node_modules (
    echo [INFO] First-time setup: Installing required software packages...
    call npm install
)

echo [INFO] Customizing the build...
call npm run build

echo.
echo [SUCCESS] Web service running!
echo ---------------------------------------------------
echo   Local Address: http://localhost:3000
echo   Persistent Data Saved in: data.json
echo.
echo   * KEEP THIS TERMINAL OPEN *
echo   To stop the server, close this window or press Ctrl+C
echo ---------------------------------------------------
echo.

:: Automatically open the web application in your default web browser (Chrome)
start "" "http://localhost:3000"

node dist/server.cjs
pause
