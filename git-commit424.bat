@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/MonthlyLoginModal.tsx
git add src/components/digital/QuestsModal.tsx
git add src/components/digital/SeasonPassModal.tsx
git add src/components/digital/SeasonPathModal.tsx
git add src/components/digital/DailyTasksModal.tsx
git add git-commit424.bat
git commit -m "feat(landscape): visi 5 progression modalai -> landscape overlay. MONTHLY LOGIN: kaire menesio progresas (skaitliukas+baras+laikmaciai), centras 30d kalendorius 6 stulpeliais, desine siandienos dovana + rytojaus preview + ATSIIMTI pinned. QUESTS: kaire 7d serijos juosta (vertikalus sarasas), centras uzduotys, desine 'dar gali gauti' suvestine + ATSIIMTI VISKA (nauja). SEASON PASS (senas): HORIZONTALUS pakopu takas (scroll ->, auto-scroll iki aktyvios), desine pasirinktos pakopos preview+CTA. SEASON PATH (naujas free+pass): horizontalus takas - kiekvienas lygis stulpelis (free virsuj/pass apacioj), desine pasirinkto lygio preview + Atrakinti pasa + Atsiimti viska pinned. DAILY TASKS: 3 korteles greta + skrynia desineje pinned CTA. tsc svarus." > commit424.log 2>&1
git push >> commit424.log 2>&1
type commit424.log
echo ============= BAIGTA (landscape: progression modalai). =============
