@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/i18n/content.ts src/lib/tutorial/engine.ts src/lib/tutorial/logText.ts src/components/tutorial/TutorialGame.tsx src/components/digital/ui/NoNativeTooltips.tsx src/app/digital/layout.tsx src/lib/profile/rankNamesEn.ts src/lib/ranked/rank.ts src/components/digital/DigitalHub.tsx src/components/digital/ranked/RankedClient.tsx src/components/digital/ranked/SeasonHistory.tsx src/lib/version.ts git-commit793.bat
git commit -m "793: isjungtos narsykles title lenteles uzvedus pele (visame /digital); cempionu gebejimu pavadinimai EN per content_translations (champion_skill); EN rangu vardai ir Season vietoj Sezonas" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2roVTLcAdN84CcY8er"
git push
git log -1 --oneline
) > commit793.log 2>&1
