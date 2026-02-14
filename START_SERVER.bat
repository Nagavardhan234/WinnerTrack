@echo off
echo Starting local web server...
echo.
echo Opening WinnerTrack at http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
start http://localhost:8000
python -m http.server 8000
