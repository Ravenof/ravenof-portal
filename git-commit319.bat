@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260802_welcome_reward.sql
git add src/components/digital/WelcomeReward.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit319.bat
echo === Commit ===
git commit -m "feat(retention #2): first-session apdovanojimas su pop-up. 20260802: profiles.welcome_reward_claimed + rvn_claim_welcome_reward (idempotentiska, 500 auksas + 2 boosteriai + 1 magiska korta per rvn__grant_payload, be exp -> nereikia xp CHECK). WelcomeReward.tsx: vienkartinis premium pop-up (portalas i body, z-400) su dovanos atskleidimu + auksinis 'Atsiimti' + sekmes garsas, po to niekada neberodomas. DigitalHub: prijungtas + naujoko 'Pradek cia' nudge (is anksto). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
