@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add tools/build-media.mjs src/lib/digital/mediaDownloader.ts src/lib/version.ts git-commit847.bat
git commit -m "847: media manifestas imamas puslapiais (Supabase 1000 eiluciu riba nukirsdavo dali LT ir EN kortu)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit847.log 2>&1
