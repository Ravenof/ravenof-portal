@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/CollectionPageFlip.tsx src/components/digital/DigitalCollection.tsx src/lib/version.ts git-commit842.bat
git commit -m "842: kolekcijos puslapio vertimo animacija - senas puslapis nuslysta, naujas atplaukia nugarelemis ir kortos apsivercia kai paveikslelis uzsikraunes; kaimyniniu puslapiu paveiksleliu preload; puslapio skaitliuko animacija" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit842.log 2>&1
