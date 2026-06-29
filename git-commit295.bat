@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit295.bat
git commit -m "feat(desktop): perdarytas Digital battle layout (premium CCG kompozicija). TIK desktop (!isTouch) saka; mobile NEPALIESTAS. Nauja 3-stulpeliu arena (maxWidth 1440): KAIRE rail (zaidejo info+HP+auksas, deck/ZMK/kapinynas pile'ai, efektu juosta), CENTRINE lenta su tikra Ravenof struktura 9 sluoksniais (prieso ranka -> prieso reakcijos -> prieso artefaktai -> prieso 5 padarai -> BENDRAS Lauko slotas -> tavo 5 padarai -> tavo artefaktai -> tavo reakcijos -> tavo ranka), DESINE rail (prieso info+HP+ranka, pile'ai, komandu zona su zaliu 'Baigti ejima'). renderSideZones isskaidytas i renderArtifactRow + renderReactionRow (atskiros eiles). Visi data-* atributai/ref'ai issaugoti (FX/drag/targeting veikia). Kortu dydziai sutankinti kad tilptu (creature 94, art/rea h72, field 106). tsc svarus."
git push
) > commit295.log 2>&1
