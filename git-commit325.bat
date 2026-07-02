@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add public/digital/ui3/cta.png public/digital/ui3/cta-blank.png
git add src/app/digital/layout.tsx src/components/digital/NotificationsModal.tsx src/components/digital/SettingsModal.tsx
git add src/components/notifications/NotificationCenter.tsx src/components/digital/ui/HubKit.tsx
git commit -m "fix(ui): /digital header ir home slifavimas. 1) Dublikuotas varpelis: globalus NotificationCenter plaukiantis bell nerodomas /digital route (toast'ai lieka). 2) Header bell dabar atidaro nauja NotificationsModal (notifications lentele: sarasas, laikas, nuorodos, auto mark-read + badge nulinamas). 3) CTA 'Pradeti kova' juodi sonai pasalinti (flood-fill key su fiksuotu bg, plokste 536px permatomais krastais). 4) Prisijungimo serijos banner: trumpesnis pavadinimas nebesiliecia su atlygiu chips. 5) ProfileChip isimtas is header (nebepersidengia su auksu) - profilis (avataras, vardas, lygis, XP juosta) perkeltas i Nustatymu modala virsuje. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit325.log 2>&1
