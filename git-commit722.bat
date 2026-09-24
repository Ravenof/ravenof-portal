@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit722.bat
git commit -m "722: auto-taikymas kai galimas tik VIENAS taikinys (pvz. pagydyk savo zaideja) - burtai/padarai is rankos (be rodykles), Paskutinis noras, cempiono skill'ai ir special summon Kovos suksnis nebeprase rinktis; >1 taikinys - kaip anksciau" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01TWsmmktwBXghS8ckS7Tb3U"
git push
git log -1 --oneline
) > commit722.log 2>&1
