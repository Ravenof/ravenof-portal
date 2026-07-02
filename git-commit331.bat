@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalDeckBuilder.tsx
git commit -m "feat(ui): Deck Builder v2 - fizinis drag&drop + gyva statistika. DnD: palaikius korta (touch 190ms / pele judesiu) ji pakyla kaip ghost mini-korta su spring fizika (playCardPick + haptika), tempiant apatine juosta virsta drop zona (Tempk cia / Paleisk - i kalade! + aukso glow), paleidus - fly-in i juosta su pulsu (playCardPlace + vibracija) arba spyruoklinis grizimas atgal; scroll neuzsikabina (long-press + non-passive touchmove preventDefault), tap/preview veikia kaip anksciau. Nauja KALADES panele (bottom sheet is sticky juostos): animuota aukso kreive (spring stulpeliai + vidurkio zymeklis), StatBox'ai su skaiciu pop animacija (kortu/vidurkis/cempionai), tipu-retumu chips, kortu sarasas su +/- ir layout animacijomis. Sticky juostoje animuotas kortu skaitliukas. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit331.log 2>&1
