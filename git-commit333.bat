@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260805_community_deck_social.sql src/components/digital/DigitalCommunityDecks.tsx
git commit -m "fix(community): suderinta su JAU esama DB schema (migracijos 42703 klaidos fix). DB jau turejo deck_votes(vote) + deck_comments(status active/hidden/deleted) + score trigeri is web portalo - migracija 20260805 perrasyta: kuria TIK deck_comment_votes, deck_comment_reports (RLS, admin read) ir rvn_copy_community_deck RPC, deck_votes/deck_comments nebelieciami. /digital UI perjungtas i esama schema: balsai per vote stulpeli (insert/update/delete kaip VoteWidget), komentarai filtruojami status=active, salinimas: adminas->hidden, autorius->deleted (trash matomas adminui ir savo komentarams). tsc+eslint svarus"
git push
git log -1 --oneline
) > commit333.log 2>&1
