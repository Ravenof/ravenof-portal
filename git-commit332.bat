@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260805_community_deck_social.sql
git add src/components/digital/DigitalCommunityDecks.tsx src/components/digital/DigitalDeckBuilder.tsx
git add src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx
git commit -m "feat(community): kaladziu balsai + komentarai + pilnas kopijavimas; feat(builder): sklandenis drag. DB (migr 20260805, DAR NEPALEISTA): deck_votes (1 user = 1 balsas -1/+1, decks.score per trigeri), deck_comments (admin/autorius salina per removed=true), deck_comment_votes, deck_comment_reports (mato tik admin), RPC rvn_copy_community_deck - pilna vieso deck kopija su is_side_deck security definer (fix: anksciau kopijuodavosi tik turimos kortos). UI: VoteBox ant korteliu ir detales (optimistinis score, top-3 medaliai), detaleje tabai Kortos/Komentarai - komentaru rasymas, balsavimas po viena, report (admin perziuri), admin trash mygtukas; kopijavimo zinute ispeja apie trukstamas kortas. Builder drag feel: lift 130ms, spyruoklinis ghost sekimas (useSpring 1400/80) + tilt pagal greiti (useVelocity->rotate), overDrop scale bump. PvE/PvP: kalades su trukstamomis kortomis nebeleidziamos zaisti (paslepiamos picker'yje su paaiskinimu) - zaisti gali tik pilnai turima kalade, redaguoti gali visada. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit332.log 2>&1
