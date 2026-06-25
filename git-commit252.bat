@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/Flames.tsx src/components/tutorial/TutorialGame.tsx src/components/tutorial/ArenaBackground.tsx git-commit252.bat
git commit -m "perf(battle): (1) Flames fonas - blur 40->28 (20 telefone), 5->4 liepsnos (3 telefone), PASLEPIAMA kovoje (.rvn-in-battle, nesisuka po ArenaBackground), paiso reduced-motion. (2) OppHandFan parallax listener isjungtas touch irenginiuose (beprasmis be hover). (3) ArenaBackground daleliu 16->8 ant touch. Mazina nuolatini GPU kruvi menu ir kovose."
git push
) > commit252.log 2>&1
