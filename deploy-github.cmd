@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================================
echo  AFTER ZERO - Deploy to GitHub (tjiravallop/after-zero-zombie)
echo  แทนที่เวอร์ชันเก่าบน GitHub ทั้งหมดด้วยเวอร์ชันใหม่ล่าสุด
echo ======================================================================
echo.
echo กำลัง Push ขึ้น GitHub origin main (Force Overwrite)...
git push -u origin main --force
if errorlevel 1 (
  echo.
  echo [!] หากระบบเปิดหน้าต่างเบราว์เซอร์ กรุณากด Sign in / Authorize เพื่อยืนยันสิทธิ์
  echo.
  pause
  exit /b 1
)
echo.
echo [✓] Push ขึ้น GitHub สำเร็จเรียบร้อยแล้ว!
echo Repository: https://github.com/tjiravallop/after-zero-zombie
echo ระบบ GitHub Actions (.github/workflows/deploy.yml) กำลังเริ่ม Build และ Deploy อัตโนมัติ
echo.
pause
