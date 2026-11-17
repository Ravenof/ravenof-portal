@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/PackOpen.tsx src/lib/version.ts git-commit807.bat
git commit -m "807: boosterio atverimas - pakuote be fono staciakampio (tik siluetas su svytejimu), plysta tik pati pakuote, mygtukai per RavenofBannerButton" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit807.log 2>&1
