@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js and try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Run pnpm install in this folder first, then open this file again.
  pause
  exit /b 1
)
call node scripts\sync-bangkok-content.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo Opening AFTER ZERO. Keep this window open while playing.
call node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 3000 --open
if errorlevel 1 pause
