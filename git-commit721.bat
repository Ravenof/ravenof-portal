@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/engine.ts scripts/simulate-aura-hp.ts package.json src/lib/version.ts supabase/migrations/20260927_card_mapping_fixes.sql KORTU-MAPPING-AUDITAS-2026-09-23.md git-commit721.bat
git commit -m "721: FIX auros HP (Eldoras siel. meistras) - recomputeAuras kiekvieno perskaiciavimo metu pagydydavo suzeista padara auros dydziu (hp += aura be atemimo), o -HP debuff auros kaupdavosi; dabar HP perskaiciuojamas pagal auros pokyti (HS semantika); game:test:aurahp 10 patikru. + kortu mappingu auditas ir migracija 20260927" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01TWsmmktwBXghS8ckS7Tb3U"
git push
git log -1 --oneline
) > commit721.log 2>&1
