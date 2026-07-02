@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit311.bat
git commit -m "feat(avatars): long-press avatara -> detailed view (foto ar tuo metu grojantis video). AvatarFrame praneša tevui dabar grojanti video (onVid). hpBar: long-press (~420ms, touch+mouse) ar desinys klik -> openAvatarInspect; click po long-press praleidziamas. Inspect overlay: didelis remas + media - jei tuo metu grojo video, rodo TA video (loop), kitaip portreta; taikomas kadravimas (fit). Esc/click uzdaro. tsc svarus."
git push
) > commit311.log 2>&1
