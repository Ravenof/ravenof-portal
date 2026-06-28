@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/tutorial/engine.ts
git add src/components/tutorial/TutorialGame.tsx
git add src/lib/tutorial2/cardPool.ts
git add src/components/tutorial2/TutorialOverlay.tsx
git add src/components/tutorial2/TutorialDirector.tsx
git add src/components/tutorial2/TutorialHub.tsx
git add src/app/digital/tutorial/page.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/admin/page.tsx
git add src/components/admin/tutorial/AdminTutorial.tsx
git add src/app/admin/tutorial/page.tsx
git add git-commit270.bat
echo === Commit ===
git commit -m "feat(tutorial v2 #3/N): runtime + UI + admin (visi 4 punktai). (1) TutorialGame kabliukai (TutorialHooks): scripted setup (applySetup), veiksmu gate (doAction - neleidzia klaidos), scripted priesas (enemyTurn), event srautas (onEvents); + data-hand-card; recomputeAuras eksportuotas; nuline regresija kai prop nera. (2) cardPool: kraunamos TUT kortos pagal varda -> TutCard/BoardUnit. (3) TutorialOverlay: dimming+spotlight (SVG mask), pulsuojantys ziedai, animuota rodykle, objektyvo juosta, dialogo burbulas, skip. (4) TutorialDirector: pamokos masina (dialogas->veiksmas->completion), gate, scripted priesas po 1 veiksma, analytics, atlygio ekranas. (5) TutorialHub /digital/tutorial: 5 lygiu pasirinkimas (lock/progress/replay/badge/reward). (6) DigitalHub 'Mokymai' -> nauja sistema (senas demo pasalintas). (7) Admin /admin/tutorial: data-driven builder (visi laukai + config/reward JSON) + seed merge/reset + analytics dashboard (completion %, drop-off, per-step laikas/klaidos). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
