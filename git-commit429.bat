@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/campaign/CampaignList.tsx
git add src/components/digital/campaign/MissionIntroPanel.tsx
git add src/components/digital/NotificationsModal.tsx
git add src/components/digital/DigitalMyDecks.tsx
git add git-commit429.bat
git commit -m "feat(landscape): Kampanija + smulkus polish. CAMPAIGN LIST: max-w-md vertikalus sarasas -> landscape grid (auto-fill 330px korteles: cover kaireje 132px + tekstas/frakcijos desineje, telpa be scroll). MISSION INTRO: bottom-sheet -> landscape dialogas 780px 2 stulpeliais (kaire lore+aprasymas+tikslai scroll / desine atlygiai + PRADETI MISIJA pinned) + Esc uzdarymas. Zemelapis jau buvo full-bleed - nekeistas. NOTIFICATIONS: Esc uzdarymas. MANO KALADES virseliai: sessionStorage cache (rodomi iskart be RPC laukimo) + loading=eager vietoj lazy. tsc svarus." > commit429.log 2>&1
git push >> commit429.log 2>&1
type commit429.log
echo ============= BAIGTA (kampanija + polish). =============
