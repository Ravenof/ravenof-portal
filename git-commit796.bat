@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/data/cutscenes/demoChapelCutscene.ts src/lib/digital/starterMeta.ts src/lib/version.ts git-commit796.bat
git commit -m "796: EN frakciju pavadinimai - Regiment of Light ir Night of Plunder" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2roVTLcAdN84CcY8er"
git push
git log -1 --oneline
) > commit796.log 2>&1
