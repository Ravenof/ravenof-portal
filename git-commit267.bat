@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/tutorial/engine.ts
git add src/lib/game/triggerSystem.ts
git add src/components/tutorial/TutorialGame.tsx
git add git-commit267.bat
echo === Commit ===
git commit -m "feat(fx): trigeriniu efektu vizualas - projektilas is saltinio + sunaikinimo sprogimas. Anksciau ejimo-pradzios (onTurnStart) ir kiti trigeriniai efektai (pvz Belzatoras naikina padara) tiesiog dingdavo be FX, nes animatorius projektila/kirti spawnina tik kai srcRef nustatytas pirmesnio event. Sprendimas: (1) naujas 'fxSource' event tipas; triggerSystem logina ji pries unit/artifact mappingus -> animatorius nustato FX saltini. (2) animatorius seka srcKind ('attack' vs 'ability'); mirties FX: melee = kirtis+suirimas, ranged/trigeris = projektilas (factionDirectionalKind) is saltinio i taikini, smugyje SPROGIMAS (big disintegrate + burn + hitFlash + hard shake) - korta istaskoma i gabalus. (3) dedup: jei zala jau paleido projektila i ta taikini, mirtis jo nedubliuoja. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
