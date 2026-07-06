@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/tutorial/BattleLayout.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit418.bat
git commit -m "feat(combat H): lentos pertvarkymas. (1) Musio zurnalas kaireje SUSKLEIDZIAMAS: default plona vertikali juosta (renderLogStripH - paskutines kortos mini), braukiama desnen/spaudi -> issiskleidzia pilnas zurnalas, braukiama kairen/spaudi -> sutraukia; kaires stulpelis 46px (sutrauktas) -> lenta platesne. (2) Artefaktai ir reakcijos - kiekvienas SAVA atskira eile (tavo ir priesio), vietoj sujungtos. (3) Visos lentos kortos +~30%: unitW 44->57, artefaktu/reakciju slotai 40->52/54->70/ikonos 20->26 (hMobile), kad art butu matomas. tsc svarus." > commit418.log 2>&1
git push >> commit418.log 2>&1
type commit418.log
echo ============= BAIGTA (lentos pertvarkymas). =============
