@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleFxLayer.tsx git-commit156.bat
git commit -m "feat(gameplay-feel): Faze 3 - destroy 'ghost-hold' (pasmerkta korta lieka vietoje su raudonu doom pulsavimu kol kirtis atskrieja, TADA subyra ir nuskrieja i kapinyna = delayed result readability); summon portalas efektu iskviestiems padarams; cempiono iskvietimo auksinis blyksnis; kortos traukimo srautas (deck->ranka)"
git push
) > commit156.log 2>&1
