@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/ArenaBackground.tsx src/components/tutorial/TutorialGame.tsx public/arenas/README.md git-commit164.bat
git commit -m "feat(arena): 8 frakciju musio arenos (crypt/arcane/cathedral/citadel/inferno/scrapyard/harbor/dojo), parenkamos atsitiktinai kovos pradzioje - dangus+horizonto svytejimas+frakcijos siluetai+perspektyvines grindys+scenos sviesa+ambientas+vignette (proceduriniai, CSS/SVG). FILE-FIRST: public/arenas/<key>.jpg uzdengia procedurini jei yra"
git push
) > commit164.log 2>&1
