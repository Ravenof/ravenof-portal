@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/effectEngine.ts src/lib/version.ts git-commit836.bat
git commit -m "836: atakos efektai (stun/nuodai) su useAttackTarget visada taikomi atakuotam padarui, ne atsitiktiniam (Kalx'as, Dagberd'as)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit836.log 2>&1
