@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/game/types.ts
git add src/lib/game/effectEngine.ts
git add src/lib/tutorial/engine.ts
git add src/components/profile/AvatarUpload.tsx
git add git-commit370.bat
echo === Commit ===
git commit -m "fix(build): itraukiam trukstamus tutorCardType failus del kuriu krito Vercel build. commit369 itrauke GameplayConfigEditor (naudoja m.tutorCardType), bet types.ts/effectEngine.ts/engine.ts (commit368) liko neikelti -> svariame checkout tipo klaida. Dabar: EffectMapping.tutorCardType + engine drawUntilHand/tutorToHand cardType filtras. Plius AvatarUpload WebP konversija (profilio avatarai). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
