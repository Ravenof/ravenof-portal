@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts scripts/simulate-combat-target.ts src/lib/version.ts git-commit720.bat
git commit -m "720: FIX Liepsnos liezuviai ir kitos onAnySummon/onAnyPlay reakcijos - is rankos suzaistas padaras nebuvo zymimas kaip trigerio saltinis (__lastSummonedUid), todel reakcija taike auto-pick'u pirma priesa; dabar zala eina ISKVIESTAM; game:test:combattarget 10 patikros" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit720.log 2>&1
