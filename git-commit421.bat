@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalPvE.tsx
git add git-commit421.bat
git commit -m "fix(pve): treniruotes ekrano polish. (1) Pasalinta paantraste (viskas pastumta i virsu). (2) Priesininko tipas -> 2x2 grid (Atsitiktine/Pasirinkta/Viesas + Mokymai kortele). (3) PRADETI KOVA perkelta i desini paneli po AI sunkumo (pinned apacioj, nebekropinasi). (4) Pasalintas apacios CTA baras -> tavo kalade + priesininko tipas paneliai tesiasi zemyn (aukstesni). (5) Pasalintas Keisti kalade mygtukas. AI sunkumo mygtukai shrink-0 sulygiuoti. tsc svarus." > commit421.log 2>&1
git push >> commit421.log 2>&1
type commit421.log
echo ============= BAIGTA (pve polish). =============
