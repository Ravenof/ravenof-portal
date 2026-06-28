@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260717_tutorial_cards.sql
git add src/data/tutorialLessons/lessonSeeds.ts
git add src/lib/tutorial2/seedRebuild.ts
git add git-commit269.bat
echo === Commit ===
git commit -m "feat(tutorial v2 #2/N): 5 pamoku seedai + papildomos kortos + seedRebuild. (1) lessonSeeds.ts: data-driven L1 Pagrindai / L2 Burtai+Battlecry / L3 Cempionas+Artefaktas+Laukas+Reakcija / L4 Taktika+mainai / L5 ZMK+statusai+prisaukimas+prakeiksmas+Tribute auginimas - kiekvienas zingsnis 1 mechanika, dialogai (vedlys Senasis Korvas), objektyvai, highlight, allow/blocked, scripted enemy, completion triggers, rewards. (2) 20260717 papildyta: Laukas/Reakcija/Nekromantas(summon)/Tamsos zenklas(curse)/Trenksmas(stun)/golemas. (3) seedRebuild.ts: saugus upsert i tutorial_lessons pagal seed_key (merge/reset). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
