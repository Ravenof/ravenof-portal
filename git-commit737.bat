@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add package.json src/components/admin/GameplayConfigEditor.tsx src/lib/game/effectEngine.ts src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/version.ts scripts/simulate-valkyrie-revive.ts git-commit737.bat
git commit -m "737: Valkirija fix - onDestroy + revive + reviveDestroyedTarget dabar prikelia BUTENT uzmusta priesa savo puseje (kill kreditas perduoda auka per chainDestroyedCards; taikinio paieska praleidziama), nauji laukai reviveAtk/reviveHp (admin editoriuje ATK/HP), test game:test:valkyrie; APP_VERSION 737" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit737.log 2>&1
