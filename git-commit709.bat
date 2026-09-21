@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/engine.ts src/lib/game/fieldEngine.ts src/lib/game/types.ts src/components/admin/GameplayConfigEditor.tsx src/locales/lt/battleLog.json src/locales/en/battleLog.json src/lib/version.ts git-commit709.bat
git commit -m "709: ZMK feel - tyli nesekmiu apsauga (po neigiamo traukimo sekantis +0 ar geresnis, neigiamos grazinamos i kalades apacia, sudetis nekinta) + naujas lauko pasyvas noZmk (ZMK traukimo nera, zala lieka bazine) su admin jungikliu ir kovos zurnalo eilute" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit709.log 2>&1
