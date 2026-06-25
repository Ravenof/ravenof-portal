@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260706_notifications.sql src/lib/notify.ts src/components/notifications/NotificationCenter.tsx src/app/layout.tsx supabase/functions/send-push/index.ts RAVENOF-PUSH-SETUP.md tsconfig.json git-commit239push.bat
git commit -m "feat(notifications): in-app pop-up toast'ai + varpelis (visur, ir Android webview) - zinutes/issukiai/mainai/aukciono pardavimai per rvn_notifications_poll; native push registracija per Capacitor bridge (be web build koreliacijos); push scaffold: send-push Edge Function (FCM v1) + user_push_tokens + setup doc (Firebase/triggeriai)"
git push
) > commit239push.log 2>&1
