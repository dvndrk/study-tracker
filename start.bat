@echo off
cd /d "%~dp0"

echo Starting CA Final Study Tracker...
echo.

REM Start server in this window
start "" cmd /k "node server.js"

REM Wait 2 seconds to allow server to boot
timeout /t 2 >nul

REM Open browser
start http://localhost:3000