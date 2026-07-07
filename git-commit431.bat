@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/tutorial/TutorialGame.tsx
git add git-commit431.bat
git commit -m "feat(cosmetics): PvP nugareles SYNC - varzovas mato tavo skin. PileBack gavo owner='me'|'opp': tavo elementai (kalade, flying draws you) rodo TAVO nugarele, varzovo (prieso ranka OppHandFan, deck-ai pile, flying draws ai) - JO nugarele, gauta per broadcast 'skin' event {back:SkinVisual}. Siuntimas: abu klientai SUBSCRIBED metu + host pakartoja gaves 'hello' (svecio velyvo prisijungimo race) + persiunciama kai getEquippedBattleSkins atsinaujina fone. OPP_BACK_KNOWN flag: gavus skin=null rodomas default back.webp; NEGAVUS nieko (botai/senas klientas) - fallback i tavo skin (OppHandFan veduokle sukurta demonstruoti card-back kosmetika). Backward-safe: senas klientas 'skin' eventa ignoruoja. Cleanup: OPP_BACK resetinamas kanalo mount/unmount. tsc svarus." > commit431.log 2>&1
git push >> commit431.log 2>&1
type commit431.log
echo ============= BAIGTA (PvP nugareles sync). =============
