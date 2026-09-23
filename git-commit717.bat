@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit717.bat
git commit -m "717: artefakto padejimas - korta nuskrenda is rankos i savo artefaktu vieta ta pacia ReactionFlyer animacija kaip reakcija (atversta), su nusileidimo ziedu ir dulkemis" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit717.log 2>&1
