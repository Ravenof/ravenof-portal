@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/img.ts apps/digital/src/runtime.ts src/lib/version.ts git-commit845.bat
git commit -m "845: korteliu vaizdai, kuriu nera vietiniame media (po kortu vaizdu atnaujinimo), imami kaip mazi thumbai, ne pilno dydzio originalai; thumbUrl palaiko URL su ?v= query" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit845.log 2>&1
