@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/app/digital/page.tsx src/components/digital/DigitalHub.tsx src/components/digital/PvPLobby.tsx src/components/tutorial/TutorialGame.tsx src/lib/tutorial/engine.ts src/lib/nav.ts src/app/arena/page.tsx supabase/migrations/20260615_pvp_matches.sql & git commit -m "feat(digital+pvp): Ravenof Digital sub-hub (/digital) su tutorial/praktika/AI/PvP; realaus laiko PvP - privatus kambarys (kodas) + atsitiktine eile, client-authoritative host per Supabase Realtime broadcast, swap-perspektyva svetiui; nav+arena nuorodos; SQL migracija pvp_matches (paleisti p?iam)" & git push ) > commit93.log 2>&1
