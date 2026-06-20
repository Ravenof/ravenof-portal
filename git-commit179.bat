@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add next.config.ts .eslintrc.json check-build.bat supabase/migrations/20260620_ranked_mode.sql src/lib/ranked/rank.ts src/lib/ranked/types.ts src/lib/ranked/bots.ts src/lib/ranked/rewards.ts src/lib/ranked/achievements.ts src/lib/ranked/season.ts src/lib/ranked/sound.ts src/lib/ranked/client.ts src/components/digital/ranked/RankBadge.tsx src/components/digital/ranked/_ui.tsx src/components/digital/ranked/Leaderboard.tsx src/components/digital/ranked/Rewards.tsx src/components/digital/ranked/Achievements.tsx src/components/digital/ranked/MatchHistory.tsx src/components/digital/ranked/SeasonHistory.tsx src/components/digital/ranked/MatchFound.tsx src/components/digital/ranked/RankedResult.tsx src/components/digital/ranked/RankedQueue.tsx src/components/digital/ranked/RankedClient.tsx src/app/digital/ranked/page.tsx src/app/admin/ranked/page.tsx src/app/admin/ranked/RankedAdminClient.tsx src/components/tutorial/TutorialGame.tsx src/components/digital/DigitalHub.tsx src/app/globals.css src/app/admin/page.tsx git-commit179.bat
git commit -m "feat(ranked): pilnas Reitingo kovos modulis - rankStep modelis (150 zingsniu, 50 numeriu x bronza/sidabras/auksas), server-authoritative RPC (sezonas/profilis/match-report su rango+loss-counter+EXP+auksas, rewards, achievements, leaderboard su tie-breakeriais, matchmaking queue, bot pick, admin set-rank/end-season), 20 botu+decks+rewards+achievements seed; UI (Ranked Home, matchmaking eile, match-found versus, rezultato ekranas, topas, atlygiai, pasiekimai, kovu/sezonu istorija, RankBadge bronze/silver/gold); admin debug irankiai (simulate win/loss, jump rank, end season, botu valdymas); TutorialGame ranked rezultato hook; bot fallback po 60s"
git push
) > commit179.log 2>&1
