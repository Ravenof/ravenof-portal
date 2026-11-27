@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add tools/cards-sync-figma.mjs supabase/migrations/20261127_media_manifest_v4_en_cards.sql src/lib/version.ts git-commit846.bat
git commit -m "846: kortu vaizdu sinchronizacija kelia 783 px plocio WebP nauju failo vardu (be ?v=) ir pabaigoje atnaujina vietiniu failu sarasa; rvn_media_manifest v4 - EN kortu vaizdai i vietinius failus" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit846.log 2>&1
