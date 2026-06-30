@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/app/admin/shop/AdminShopClient.tsx src/lib/cosmetics.ts supabase/migrations/20260801_avatar_portrait_fit.sql git-commit306.bat
git commit -m "fix(avatars): end-turn mygtukas nebenusikerpa + portreto/video kadravimas. Mobile 'Priesininko ejimas' -> 'Prieso ejimas...' + mazesnis sriftas (nebeislenda uz ekrano). Naujas portrait_fit (x/y/zoom) cosmetics laukas (migracija 20260801 + rvn_get_cosmetics grazina portraitFit); cosmetics.ts + BattleAvatar.fit. AvatarFrame taiko objectPosition + scale(zoom) IR nuotraukai, IR video (nebe vien centras). Admin AdminAvatarFit: live perziura su remu, tempk-pamesk + X/Y/Zoom slankikliai, Centruoti, Issaugoti kadravima. tsc svarus."
git push
) > commit306.log 2>&1
