@echo off
set "PATH=C:\Users\Desktop\.mingit\cmd;%PATH%"
echo [StudyPack] Pushing latest changes to GitHub and Hostinger Auto-Deploy...
git add .
git commit -m "Auto-deploy update: %date% %time%"
git push origin main
echo.
echo [Done] Successfully pushed! Hostinger will auto-update in ~2 seconds.
pause
