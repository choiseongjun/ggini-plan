@echo off
setlocal
cd /d "%~dp0"
call npm run catalog:expand -- --target=2000
echo.
if errorlevel 1 (echo Collection stopped. Progress is saved. Check the message above.) else (echo Korean catalog expansion completed.)
pause
