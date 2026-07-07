@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"

rem ── valymas: paseno/sugadinti failai ──
if exist "supabase\migrations\ravenof_main_menu_cropped_assets" rmdir /s /q "supabase\migrations\ravenof_main_menu_cropped_assets"
git rm -f --ignore-unmatch "supabase/migrations/.fuse_hidden0000000900000001" >nul 2>&1
git rm -f --ignore-unmatch "supabase/migrations/.fuse_hidden0000000a00000002" >nul 2>&1
git rm -f --ignore-unmatch "src/components/digital/DigitalAlbum.tsx" >nul 2>&1
git rm -f --ignore-unmatch ".eslintrc.json" >nul 2>&1

git add supabase/migrations/20260820_news_presence_fixes.sql
git add tools/run-migrations.mjs
git add src/lib/news.ts
git add src/lib/social.ts
git add src/lib/economy.ts
git add src/app/digital/layout.tsx
git add src/components/digital/DigitalHub.tsx
git add src/components/social/FriendsClient.tsx
git add src/components/tutorial/TutorialGame.tsx
git add eslint.config.mjs
git add package.json
git add package-lock.json
git add git-commit432.bat
git commit -m "feat+chore(backlog): naujienos is DB + draugu online + valymas. (1) migr 20260820: news lentele (admin CRUD per RLS, seed 3) + profiles.last_seen_at + rvn_heartbeat + rvn_friends_list gr4zina online/lastSeen (online = <2min) + kosmetikos typo fix (Nuodu nugarele); runner iki 20260829 - REIKIA run-migrations.bat. (2) Home naujienos is DB (lib/news.ts, fallback i statini jei tuscia). (3) Draugu ONLINE: heartbeat kas 60s+focus is digital layout; FriendsClient zalias taskas prie prisijungusiu; Home Draugai korteleje 'N online' badge. (4) Cleanup: reportMatchXp+MatchXp tipai isimti (dead code, RPC prod'e net nebuvo - viska daro reportMatchV2), DigitalAlbum.tsx istrintas (legacy, route redirectina i collection), .fuse_hidden ir asset dublikatai is supabase/migrations isvalyti. (5) ESLINT v9 VEIKIA: naujas eslint.config.mjs (FlatCompat + next extends + ignores), senas .eslintrc.json pasalintas; pataisytas pirmas rastas error (unused balances Hub'e). package.json/lock (pg dev dep) sucommitinti. tsc svarus, eslint 0 errors pakeistuose." > commit432.log 2>&1
git push >> commit432.log 2>&1
type commit432.log
echo ============= BAIGTA (backlog: naujienos + online + cleanup). =============
