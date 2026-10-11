@echo off
cd /d "%~dp0"
title dvndrk Study Tracker

echo Starting dvndrk Study Tracker...
echo (Close this window to stop the app.)
echo.

REM The server opens the browser itself once it is ready.
node server.js --open

echo.
echo The server stopped. Press any key to close.
pause >nul
