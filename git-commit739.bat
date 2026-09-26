@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalCollection.tsx src/components/digital/DigitalDeckBuilder.tsx src/lib/version.ts src/stores/deckBuilderStore.ts  git-commit739.bat
git commit -m "739: Kaladziu kurimas - tikros frakciju ikonos (public/ravenof-ui/factions) vietoj emoji frakcijos pasirinkime ir antrasteje; nauja kalade pagal nutylejima viesa (public); kolekcijoje ir builderyje pagal nutylejima ijungta Tik turimos; APP_VERSION 739" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit739.log 2>&1
