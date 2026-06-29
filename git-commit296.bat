@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit296.bat
git commit -m "fix(fx): explosion + ZMK target tikslinimas. (10) Sunaikintos kortos gabalai nebereasemblinasi i origin - issilaksto trumpai (0.28) tada skrenda TIESIAI i kapinyna ir TEN sukrinta i kruva (be tarpinio sugrupavimo vietoje). Pridetas garsas: smugis sprogimo metu + duslus smugis kai gabalai sukrinta kapinyne (~1s). (9) ZMK miniaturos dabar atsiranda PRIE savo taikinio, ne visos prie player: damage log neturi tgt kuriniams, todel taikinys randamas pagal cardName (kurinys/artefaktas pagal varda), player jei tiesiogine zala, fallback i paskutini pasirinkta tgt (uid->cache, veikia ir mirusiems). AoE/multi -> ZMK prie VISU taikiniu (grupuojama pagal pozicija). tsc svarus."
git push
) > commit296.log 2>&1
