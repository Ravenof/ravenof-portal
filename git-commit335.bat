@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/PackOpen.tsx
git commit -m "feat(ui): pack opening v2 - augantys retumo efektai + medinis stalas. RarityFx pakopos reveal metu: common - nieko; uncommon - zalios daleles skraido aplink korta (loop); rare - dideli melyni nuvilnijantys ziedai + platesnis glow; epic - dideli violetiniai dumu kamuoliai kylantys aplink; legendary - raudoni dumai + 4 zaibai (SVG polyline flicker su glow) + kortos drebejimas + max glow. DONE ekranas: vietoj saraso - kortos ismetytas ant seno medinio stalo is lentu (repeating-gradient lentos + siules + vinjete): laisvo rato issklaidymas su jitter/rotacija, spring sukritimo animacija, VISAS batch sukiojamas velkant pirsta per stala (spring rotate + suppress click), kortos tiltinasi per GameCard, bakstelejus - priartinta apziura (spring zoom is stalo pozicijos, pavadinimas+retumas), Sukiok stala hint. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit335.log 2>&1
