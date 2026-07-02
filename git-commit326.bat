@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add public/digital/ui3
git add src/components/digital/ui/HubKit.tsx src/components/digital/DigitalHub.tsx
git commit -m "fix(ui): Pradeti kova ir rezimu mygtukai pagal nauja referenca (UI elements/Naujas aplankas). CTA: nauja plokste cta2.png istraukta is refero su tikslia formos kauke - jokiu juodu sonu, naujas failo vardas apeina sena cache. Rezimai: mode2-{pve,ranked,free}.png permatomais oktagono kampais (vienodas 288x136 canvas, isvalytas alpha) - matosi hero arena pro sonus kaip mockup'e. ModeSelector: vienas img per rezima, pasirinktam CSS aukso glow + raudonas deimanto zymeklis virsuje, imgSel optional. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit326.log 2>&1
