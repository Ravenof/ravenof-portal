@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/Flames.tsx src/lib/settings.ts src/components/digital/SettingsModal.tsx
git add src/lib/game/musicManager.ts src/components/notifications/NotificationCenter.tsx
git add src/app/digital/layout.tsx src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalDeckBuilder.tsx src/components/digital/DigitalCommunityDecks.tsx
git add PERFORMANCE.md backup-now.bat
git commit -m "perf: baterijos/resursu optimizacijos (zr. PERFORMANCE.md). Flames: 5->3 sluoksniai, be mix-blend-mode, letesnes animacijos, will-change, prefers-reduced-motion + naujas Nustatymai 'Fono efektai' jungiklis (rvn:bgfx event, localStorage). Muzika pristabdoma app fone (visibilitychange) ir tesiama grizus. Notifikaciju polling praleidziamas kai document.hidden. Header be nuolatinio backdrop-blur (brangus mobile GPU). .rvn-glow nebe box-shadow keyframes (paint kas kadra) - statinis ::after sesejis + opacity pulse (composited). Layout: profilio uzklausa tik mount+focus (nebe kas route), route'ui tik head-count. Sarasu img loading=lazy decoding=async. + backup-now.bat (backup commit + saka + tag + push + zip kopija salia projekto)"
git push
git log -1 --oneline
) > commit336.log 2>&1
