@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/CollectionPageFlip.tsx src/components/digital/DigitalCollection.tsx src/lib/version.ts git-commit843.bat
git commit -m "843: kolekcija - kaimyniniu puslapiu preload tik kai dabartinis puslapis uzsikroves, po 3 vienu metu, zemu prioritetu, vertimas eile nutraukia (842 preload letino krovima)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit843.log 2>&1
