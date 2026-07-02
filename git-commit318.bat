@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pasalinam netycia i migracijas patekusi asset aplanka (jei yra) ===
if exist "supabase\migrations\ravenof_main_menu_cropped_assets" rmdir /s /q "supabase\migrations\ravenof_main_menu_cropped_assets"
echo === Pridedam .gitignore ===
git add .gitignore
git add git-commit318.bat
echo === Commit ===
git commit -m "chore: gitignore UI asset source aplankus (UI elements, ravenof_main_menu_cropped_assets) + pasalintas dublikatas is supabase/migrations. Assetai jau iskirpti i public/digital/ui2; saltiniai lieka tik lokaliai, neteršia repo/deploy."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
