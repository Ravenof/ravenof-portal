@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/CosmeticsModal.tsx
git add src/components/digital/SettingsModal.tsx
git add git-commit425.bat
git commit -m "feat(landscape): Kosmetika + Nustatymai -> landscape 3 zonu overlay. KOSMETIKA: kaire kategorijos (nugareles/avatarai) + aukso balansas headery; centras kolekcijos grid (plyteles pasirenkamos, rodo busena Naudojama/Turima/kaina); desine DIDELIS showcase (avataras 130px apskritimas / nugarele 130x176) + retumas + aprasymas + balso perziura + PIRKTI/NAUDOTI pinned. NUSTATYMAI: kaire kategorijos (Garsas/Vaizdo efektai/Pranesimai-native); centras pasirinktos kategorijos nustatymai (sliders+toggles, saugoma iskart); desine zaidejo profilio kortele (avataras+lygis+XP baras) + Atstatyti numatytuosius (nauja) + Uzdaryti pinned. Nebe siauras portrait scroll stulpas. tsc svarus." > commit425.log 2>&1
git push >> commit425.log 2>&1
type commit425.log
echo ============= BAIGTA (landscape: kosmetika + nustatymai). =============
