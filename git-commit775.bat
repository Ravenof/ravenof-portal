@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts supabase/migrations/20261112b_faction_icons_canonical.sql git-commit774.bat git-commit775.bat
git commit -m "775: versijos pakelimas (kasdieniu atlygiu ekrano pataisos is 774 antros dalies pasiekia klientus) + frakciju ikonu migracija" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit775.log 2>&1
