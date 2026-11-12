@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/components/tutorial/TutorialGame.tsx git-commit776.bat
git commit -m "776: mokymai - 1 pamokos zingsnis Palaikyk ant kortos uzskaitomas ir atidarius perziura desiniu peles klavisu (kompiuteryje strigdavo iki Istrigo mygtuko)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit776.log 2>&1
