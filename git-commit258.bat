@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit258.bat
git commit -m "fix(pvp): guest (antras prisijunges) matydavo savo traukiamas kortas uzverstas. Priezastis: host-authoritative zurnale cardName buvo slepiamas pagal absoliucia seat pozicija (s===you), o guest host'e yra 'ai', tad jo paties traukimu cardName=undefined; po swapPerspective side tampa 'you', bet pavadinimas jau prarastas -> reveal rodo nugareli. Sprendimas: draw log'ai visada nesa cardName: c.name (busenoje), o slepimas perkeltas i atvaizdavima pagal side. Zurnalo panele: draw + side!=='you' -> thumbnail nerodomas (prieso traukimas lieka uzverstas). Balso prefetch tik savo traukimui. Skraidancios kortos FX jau gating'ino sd===you -> guest savo traukima dabar atsivercia. PvE elgesys nepakitęs. tsc svarus."
git push
) > commit258.log 2>&1
