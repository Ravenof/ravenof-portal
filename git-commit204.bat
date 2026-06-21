@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/team2v2/engine.ts src/lib/team2v2/cards.ts src/components/digital/Team2v2Battle.tsx src/components/digital/DigitalCoop.tsx git-commit204.bat
git commit -m "feat(2v2): FAZE 2 - zaidziamas realaus laiko 2v2 co-op vs botai kovos branduolys: engine (auksas laike, kuriniai, atakos su cooldown, bendras komandos HP, win), kortu uzkrovimas (zaidejo kalade + botu frakciju kuriniai), Team2v2Battle UI (4 lentos, 2 HP juostos, ranka, real-time loop, botai vienu metu), wire is lobby. Supaprastinta mechanika (be ZMK/efektu) - parity veliau"
git push
) > commit204.log 2>&1
