@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260705_chat.sql src/lib/social.ts src/components/social/FriendsClient.tsx src/components/tutorial/TutorialGame.tsx git-commit238.bat
git commit -m "feat(social): draugu chat (friend_messages + rvn_send_message/conversation; chat langas /friends), kovos chat PvP metu (per esama broadcast kanala, plaukiojantis widget), ir laimejimo/pralaimejimo lange mygtukas Prideti priesininka i draugus (rvn_friend_request_id pagal opponentId)"
git push
) > commit238.log 2>&1
