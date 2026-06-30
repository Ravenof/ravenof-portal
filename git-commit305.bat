@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit305.bat
git commit -m "feat(mobile): pertvarkyta apatine valdymo juosta. Avataras -> CENTRAS, auksas -> KAIRE, 'parduoti korta +100' po auksu ir ZALIAS, baigti ejima ZALIAS (myTurn) / RAUDONAS 'Priesininko ejimas' (kai ne tavo). Pile'ai (kalade/kapinynas/ZMK) desineje virs baigti ejima. Padidinimo stiklas (hand zoom) visai pasalintas - ranka issiplecia paspaudus korta. Mobile rankos overlap sumazintas (0.32->0.1) + kortos didesnes (72->80) - isnaudota atlaisvinta erdve, kortos nebepersidengia. tsc svarus."
git push
) > commit305.log 2>&1
