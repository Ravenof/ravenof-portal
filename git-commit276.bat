@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/digital/layout.tsx
git add git-commit276.bat
echo === Commit ===
git commit -m "feat(ui): Digital pagrindinio meniu redizainas - modern mobile game lobby. Reusable HubKit komponentai (ProfileChip, ResourcePill, IconBtn, RewardBanner, ModeSelector, PlayHeroCard, QuickActionCard, ProgressionCard, CountBadge, HubStyles). Header = game account: logo (mazesnis) + profilis (avatar/Lv/XP juosta) + gold/gift pills + bell(badge) + settings. DigitalHub: plonas reward banner su 'Atsiimti' CTA + claimable glow; PlayHeroCard 'ZAISTI DABAR' su pagrindiniu 'Pradeti kova' CTA + ModeSelector (3 rezimai, selected state, ranked default); 2x2 QuickActions (Kalades/Kolekcija/Uzduotys+badge/Parduotuve+gift); ProgressionCards (Sezono kelias progress, Mokymai, Kampanija locked/GREITAI). Bottom nav: Pradzia/Kolekcija/Kalades/Parduotuve/Daugiau (Home ikona, aktyvus = auksinis glow). Spalvos juoda/bordo/violetine/auksas, touch >=44px, safe-area virsuj/apacioj, pressed state visur. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
