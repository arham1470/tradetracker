@echo off
REM TradeTrack — start the Express API and the Vite client together.

setlocal
cd /d "%~dp0"

echo Starting TradeTrack server (port 5000)...
start "TradeTrack Server" cmd /k "npm run dev:server"

echo Starting TradeTrack client (port 5173)...
start "TradeTrack Client" cmd /k "npm run dev:client"

echo.
echo Both dev servers are starting:
echo   API    -^> http://localhost:5000
echo   Client -^> http://localhost:5173
echo.
echo Close the two spawned windows to stop them.
endlocal
