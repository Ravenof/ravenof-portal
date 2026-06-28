@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260716_tutorial_system.sql
git add supabase/migrations/20260717_tutorial_cards.sql
git add src/lib/tutorial2/lessonTypes.ts
git add src/lib/tutorial2/analytics.ts
git add src/lib/tutorial2/lessonLoader.ts
git add git-commit268.bat
echo === Commit ===
git commit -m "feat(tutorial v2 #1/N): pamatas - data-driven onboarding variklio DB + tipai + analytics. (1) 20260716: tutorial_lessons (config jsonb = pilnas pamokos scenarijus), tutorial_progress (attempts/best_time/claimed), tutorial_events (analytics: per-step laikas, wrong_action, drop-off) + RPC rvn_tutorial_state/complete/log_event/analytics + RLS; 'tutorial' pridetas i xp CHECK. (2) 20260717: valdomos TUT-### kortos (status=hidden) su teisingu gameplay JSONB - vanilla padarai, battlecry, 6 burtai (zala/gydymas/sunaikinimas/traukimas/AOE/uzsaldymas), cempionas (3 skills), artefaktas. (3) TS: lessonTypes (LessonConfig/Step/ScriptedAction/Highlight/Objective/AllowedAction), lessonLoader, analytics klientas. tsc+SQL svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
