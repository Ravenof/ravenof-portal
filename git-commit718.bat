@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts scripts/simulate-combat-target.ts package.json src/lib/version.ts git-commit718.bat
git commit -m "718: kovos taikinio kanonas - onAttack/onAttacked/onAfterAttack efektai (nuodai, stun, saldymas, zala) taikomi ATAKUOTAM/atakuotojui, o ne atsitiktiniam padarui (ApplyCtx.combatTarget); game:test:combattarget 6 patikros" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit718.log 2>&1
