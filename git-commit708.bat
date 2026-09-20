@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleLayout.tsx src/components/tutorial/DesktopBattleLayout.tsx src/lib/game/timing.ts src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts FX-ROLLBACK-IR-EFEKTU-SISTEMOS.md git-commit708.bat
git commit -m "708: ROLLBACK - ZMK ir raktazodziu FX (705-707) isimti is kovos, grazinta 704 chronologija; KeywordFxLayer ir /dev/keyword-fx palikti kaip medziaga busimam bandymui (neijungti)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit708.log 2>&1
