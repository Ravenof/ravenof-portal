@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalPvE.tsx
git add src/components/digital/ranked/RankedClient.tsx
git add git-commit446.bat
git commit -m "fix(pve/ranked): PRADETI KOVA GARANTUOTAI matomas bet kokiam ekrano auksty. Struktura: desines paneles vidurys (Tu/Priesininkas + AI sunkumas) -> atskiras flex-1 min-h-0 overflow-y-auto konteineris, CTA shrink-0 PO jo - jei netelpa, scrollinasi vidurys, o mygtukas fiziskai negali buti isstumtas uz paneles (overflow-hidden nebekerpa CTA). Papildomai: summary/sunkumo fontai+paddingai vh-clamp (zemam telefonui susitraukia), diffBtn minHeight 36->clamp(28,4.8vh,36), CTA minHeight clamp(40,7vh,58). RANKED atlygiu panele: vidurys taip pat scrollinamas (justify-between -> flex-1 overflow-y-auto), Perziureti atlygius pinned. data-pve-v=446 deploy markeris patikrai. tsc+eslint svarus." > commit446.log 2>&1
git push >> commit446.log 2>&1
type commit446.log
echo ============= BAIGTA (CTA visada matomas). =============
