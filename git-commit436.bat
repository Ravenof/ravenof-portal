@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260822_media_manifest_v2.sql
git add src/lib/digital/mediaDownloader.ts
git add src/lib/game/mediaCache.ts
git add src/lib/game/avatarVideoCache.ts
git add src/lib/game/voiceManager.ts
git add git-commit436.bat
git commit -m "feat(offline): manifest v2 + F4 player suvienodinimas. KRITINIS manifest fix: 386 is 451 kortu art gyvena Vercel public/cards (santykiniai keliai), o ne Supabase - manifest v1 ju nemate ('Atsisiusti viska' butu praleides 86 proc. kortu!); migr 20260822 rvn_media_manifest v2 itraukia santykinius /public kelius (bytes=0, progresas failais), mediaDownloader absoliutina su location.origin kad cache raktas sutaptu su puslapio uzklausomis. F4: naujas lib/game/mediaCache.ts cachedFetch (cache-first i rvn-media-v1, veikia ir be SW) - voiceManager AudioContext fetch'ai per ji; avatarVideoCache perjungtas is atskiro rvn-avatar-videos-v1 i bendra rvn-media-v1 (Isvalyti + apskaita mato viska; senas cache istrinamas vienkartinai). new Audio() player'iai (musika/sfx/avataru balsai) nekeisti - juos dengia SW fetch intercept. REIKIA run-migrations.bat (20260822). tsc+eslint svarus. Patikrinta prod: manifest 445 failai/157MB pries fix." > commit436.log 2>&1
git push >> commit436.log 2>&1
type commit436.log
echo ============= BAIGTA (manifest v2 + F4). =============
