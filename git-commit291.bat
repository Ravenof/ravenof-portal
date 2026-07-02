@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx git-commit291.bat
git commit -m "feat(coinflip): tikra dvipuse moneta + admin zalia/raudona editorius (3/11). In-game animacija dabar dvipuse 3D moneta (zalia ✔ / raudona ✘ pusES), verciasi rotateX (4 pilni apsisukimai + 180 jei raudona) ir nutupia ant rezultato puses - nebe vienpuse is anksto nuspalvinta. Sansai jau 50/50 (Math.random < 0.5). Admin coinFlip: vietoj 'JSON rezimo' - kiekvienos puses (zalia/raudona) efekto/taikinio/reiksmes/renkasi editorius (coinGreen[0]/coinRed[0]); medis: 1 plain mapping, 2 coinFlip, 3 chooseEffect (Arba). tsc svarus."
git push
) > commit291.log 2>&1
