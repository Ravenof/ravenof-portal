@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/digital/starterMeta.ts src/lib/game/cinematics.ts src/lib/version.ts git-commit808.bat
git commit -m "808: EN frakciju pavadinimai suvienodinti su meniu (March of Death, Melody of Mystics, Vryhiok Pack - is DB vertimu); cempionu gebejimu komikso intarpu uzrasai EN kalba" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit808.log 2>&1
