@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/ranked/RankedClient.tsx
git add src/components/digital/DigitalPvP.tsx
git add src/components/digital/DigitalPvE.tsx
git add git-commit417.bat
git commit -m "fix(menus): menu feedback pataisos. (1) RANKED: auto-parenka pirma kalade -> IESKOTI KOVOS mygtukas nebedisabled/matomas, galima zaisti ranked. (2) FRIENDLY PvP: CTA eile flex-1 (Atsaukti nebekropinamas), kompaktiskesni draugu row'ai (matosi daugiau), + AISKUS matchmaking popup overlay (spinneris+status+kodas+atsaukti) kai ieskoma varzovo. (3) BOT PRAKTIKA: DigitalPvE perdarytas i VIENA landscape ekrana (kalades karusele + priesininko tipas: atsitiktine/pasirinkta frakcija/viesas deck + santrauka+sunkumas + CTA) - nebe 2 langai, CTA visada matomas be scroll, ikonos su fiksuotu dydziu (nebeissiplecia/neblur). tsc svarus." > commit417.log 2>&1
git push >> commit417.log 2>&1
type commit417.log
echo ============= BAIGTA (menu fixes). =============
