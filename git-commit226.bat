@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/PackOpen.tsx src/components/digital/DigitalAlbum.tsx src/components/digital/StoreModal.tsx git-commit226.bat
git commit -m "fix(shop/pack): booster pack pic rodomas atplesime (packImage is card_packs.image_url, fallback svarus 🎴 vietoj broken icon), shop plyteles auksciau (aspect 3/4 - booster art tilpsta), pack-open done grid platesnis (3-4 stulpeliai vietoj 5 - kortos matomos, ne tik rarity taskai)"
git push
) > commit226.log 2>&1
