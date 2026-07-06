@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/app/digital/layout.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit406.bat
echo === Commit ===
git commit -m "feat(menu): landscape lock visam /digital app + Home ekrano landscape redizainas. (1) DigitalLayout: lockLandscape mount'e (visas app landscape, ne tik kova) + portrait 'Pasuk telefona' overlay; header'yje ProfileChip (avataras+vardas+lygis) kaireje, valiutos centre, bell/settings desineje. (2) DigitalHub perdarytas i landscape lobby: kaire=Dienos uzduotys (tikras tasku sarasas+progresas+atsiimti), centras=PlayHeroCard+rezimu selektorius, desine=Sezono progresas (pakopa+juosta+atsiimti), apacia=kosmetika/naujienos/draugai. Visa logika/duomenys/modalai issaugoti. tsc svarus." > commit406.log 2>&1
echo === Push ===
git push >> commit406.log 2>&1
type commit406.log
echo.
echo ============= BAIGTA (Home landscape + app lock). =============
