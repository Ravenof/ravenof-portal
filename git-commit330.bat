@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalMyDecks.tsx
git commit -m "feat(ui): Mano kalades - LENTYNA + soninis kalades inspektorius. Kalades kaip dezutes lentynose (po 3, medine lenta su aukso briauna), virselis = starter kalades img pagal frakcija (rvn_get_starter_decks), fallback frakcijos gradientas; badge'ai: galioja/negalioja, truksta kortu, pavadinimas+frakcija+kiekis. Paspaudus - drawer is desines (framer-motion): kortu sarasas (kaina/tipas/retumas/atk-hp/xN, tap -> detali korta), statistika: kortu kiekis, aukso vidurkis, cempionai, AUKSO KREIVE (0-7+ histograma), tipu ir retumu chips, trukstamu kortu ispejamas; veiksmai: redaguoti/isbandyti/kopijuoti/istrinti (kopija dabar islaiko is_side_deck). Nauja kalade - tuscia vieta lentynoje. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit330.log 2>&1
