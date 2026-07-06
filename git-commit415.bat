@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/tutorial/PracticeButton.tsx
git add git-commit415.bat
git commit -m "feat(praktika): platus landscape opponent-selection modalas (pagal reference). 3 tabai: Atsitiktine frakcija (paaiskinimas, CTA is karto) / Pasirinkta frakcija (frakciju grid su archetipo tekstu) / Viesas deck (paieska + frakcijos filtras + deck kortos su autoriumi/populiarumu/Perziura/Pasirinkti). Desineje santrauka (Tu / Priesininkas / Sunkumas) + AI sunkumas + PRADETI KOVA + Atsaukti. Modalas min(1100px,94vw) x min(620px,92vh). Random klientinej pusej parenka atsitiktine frakcija. tsc svarus." > commit415.log 2>&1
git push >> commit415.log 2>&1
type commit415.log
echo ============= BAIGTA (praktika modalas). =============
