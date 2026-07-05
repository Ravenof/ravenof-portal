@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260812_monthly_login.sql
git add src/lib/gamification/monthlyLogin.ts
git add src/components/digital/MonthlyLoginModal.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit375.bat
echo === Commit ===
git commit -m "feat(economy phase3): menesio 30-dienu prisijungimo kalendorius. migr 20260812: monthly_login_rewards (30+31 dienu seed, admin redaguos) + user_monthly_login (unique user+date_key ir user+month+day = idempotencija, 1/diena); rvn_get_monthly_login + rvn_claim_monthly_login (NE baudzianti serija: sekantis neatsiimtas; reset menesio 1d; 31d=100 Sidabras; grant per rvn__grant_reward_payload). monthlyLogin.ts servisas. MonthlyLoginModal.tsx (30 dienu tinklelis, milestone 7/14/21/30, dovana 30d, laikmaciai, claim). DigitalHub: mygtukas + auto-atidarymas 1x/diena jei claimable. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause
