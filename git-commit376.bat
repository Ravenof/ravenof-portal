@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260813_daily_tasks.sql
git add src/lib/gamification/dailyTasks.ts
git add src/components/digital/DailyTasksModal.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit376.bat
echo === Commit ===
git commit -m "feat(economy phase4): dienos uzduotys (3: easy/medium/hard) + reroll + dienos skrynia. migr 20260813: daily_task_templates (seed, admin) + user_daily_tasks/completion/rerolls; reset 05:00 (rvn__daily_key); progresas per DB TRIGERI ant matches (tik valid, server-authoritative); rvn_get_daily_tasks (generuoja 3, po 1/difficulty, vengia dublikatu), rvn_claim_daily_task (+check_level_rewards), rvn_claim_daily_chest (10% pack), rvn_reroll_daily_task (1 free + 50 Sidabras, max 3). dailyTasks.ts + DailyTasksModal.tsx. DigitalHub: 'Uzduotys' -> naujas modalas, questsPending is nauju tasku. Pastaba: ranked-objektyvai progresuos tik po ranked integracijos (matches insert tik bot/unranked). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause
