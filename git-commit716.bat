@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/logGroups.ts src/components/tutorial/BattleLogList.tsx src/components/tutorial/TutorialGame.tsx src/lib/i18n/resources.ts src/locales/lt/battleLogShort.json src/locales/en/battleLogShort.json scripts/simulate-log-groups.ts package.json tsconfig.check.scene.json src/lib/version.ts ravenof-log-preview.html KOVOS-ZURNALAS-V2-PLANAS.md kovos-zurnalas-dabar.png git-commit716.bat
git commit -m "716: kovos zurnalas v2 - 1 kortele = 1 veiksmas (logGroups.ts grupavimas), rezultatai zetonais su ZMK zyme, ejimo antraste su auksu/traukimais, filtras Svarbu (numatytas), detales bakstelejus, mobilus strip is miniatiuru; vienas BattleLogList komponentas desktop/drawer/strip; game:test:log 29 patikros" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit716.log 2>&1
