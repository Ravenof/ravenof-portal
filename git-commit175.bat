@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add public/arenas/arcane.jpg public/arenas/cathedral.jpg public/arenas/citadel.jpg public/arenas/crypt.jpg public/arenas/dojo.jpg public/arenas/harbor.jpg public/arenas/inferno.jpg public/arenas/scrapyard.jpg src/components/tutorial/ArenaBackground.tsx git-commit175.bat
git commit -m "fix(arena): visi 8 arenu paveiksleliai suspausti (~2.5MB -> ~250KB, greitas krovimas), dock->harbor teisingas vardas; auto-detektas - random rinks tik arenas su paveiksleliu (nerodys proceduriniu uzkrautoms)"
git push
) > commit175.log 2>&1
