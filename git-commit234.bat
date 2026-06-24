@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260702_social_friends.sql src/lib/social.ts src/components/digital/PvPLobby.tsx src/components/digital/DigitalPvP.tsx src/components/social/FriendsClient.tsx src/app/friends/page.tsx src/components/digital/DigitalHub.tsx git-commit234.bat
git commit -m "feat(social): draugu sistema + iššukis. /friends puslapis (prideti pagal varda, uzklausu accept/decline, draugu sarasas, gauti issukiai). RPC friendships+friend_challenges. Issukis -> /digital/pvp?host=CODE (issaukejas hostina) / accept -> ?join=CODE (per esama pvp_matches). DigitalHub Draugai plytele"
git push
) > commit234.log 2>&1
