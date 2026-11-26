@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add tools/figma-cards-plugin/code.js tools/figma-cards-plugin/ui.html run-figma-sink.bat git-commit838.bat
git commit -m "838: Figma kortu plugin'as - keicia visus matomus numerio sluoksnius, eksportas tik pasirinktu kortu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit838.log 2>&1
