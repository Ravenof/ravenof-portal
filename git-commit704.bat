@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260926_collection_new_cards.sql src/lib/economy.ts src/components/digital/PackOpen.tsx src/components/digital/DigitalCollection.tsx src/locales/lt/collection.json src/locales/en/collection.json src/lib/version.ts git-commit704.bat
git commit -m "704: naujos kortos - NAUJA zenklas atplesiant pakuote (ir karuseleje) + kolekcijos filtras Naujos su zyma, zymos nuimamos perziurejus arba mygtuku (user_collections.is_new + trigeris)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit704.log 2>&1
