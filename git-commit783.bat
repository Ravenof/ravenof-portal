@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/gamepad/core.ts src/components/digital/gamepad/GamepadLayer.tsx
git add src/lib/game/comicStage.ts src/lib/game/cinematics.ts src/lib/game/cinematicQueue.ts src/lib/game/types.ts src/components/tutorial/ComicCinematicOverlay.tsx src/components/tutorial/RavenofCinematicOverlay.tsx src/components/tutorial/TutorialGame.tsx src/components/admin/ComicUpload.tsx src/components/admin/GameplayConfigEditor.tsx git-commit783.bat
git commit -m "783: komikso intarpas iskvietimams (Kirtis). Vietoj video - astriu kampu kadrai is paveiksleliu rinkinio (close-up, veiksmas, herojus) su pjuviu, zybsniais, greicio linijomis ir garsu; trys lygiai: pilnas legendinei ir cempionui, vidutinis kitoms kortoms, trumpas pakartotiniam iskvietimui toje pacioje kovoje; korta nusileidzia ir jos efektai prasideda tik kadrams isslydus; balso replika skamba ant herojaus kadro; admine prie kortos - rinkinio ikelimas, fokuso taskai ir perziura. Jei 782 dar nebuvo ikeltas - sis commit ikelia ir jo valdiklio pataisas" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2pquWqjVVw7HiXJktG"
git push
git log -1 --oneline
) > commit783.log 2>&1
