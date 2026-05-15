@echo off
echo Starting MCBEE Skills Foundation local server...
echo.
echo Main site:  http://localhost:8765
echo Admin:      http://localhost:8765/admin.html
echo.
start http://localhost:8765
python -m http.server 8765
pause
