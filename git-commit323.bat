@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === npm install (sinchronizuoja package-lock su nauju pluginu) ===
call npm install
echo === (native) sinchronizuojam Capacitor Android ===
call npx cap sync android
echo === Pridedam failus ===
git add src/components/digital/WelcomeReward.tsx
git add supabase/migrations/20260802_welcome_reward.sql
git add src/lib/digital/native.ts
git add src/app/digital/layout.tsx
git add src/components/digital/SettingsModal.tsx
git add package.json package-lock.json
git add android
git add git-commit323.bat
echo === Commit ===
git commit -m "fix(build): itraukiam trukstama WelcomeReward.tsx (+20260802 migr) del kurios krito Vercel build (DigitalHub importavo neegzistuojanti faila). feat(retention #6): grizimo kabliukai - Capacitor LocalNotifications kasdieniai priminimai (native.ts scheduleReturnReminders/cancel/setRemindersEnabled, 19:00 dienos atlygis + 12:30 kova, allowWhileIdle); layout planuoja native mount metu; Settings 'Priminimai' jungiklis (tik native); package.json @capacitor/local-notifications. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
