@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add public/icons/frame.png public/icons/frame_orig.png supabase/migrations/20260731_avatar_videos.sql src/lib/cosmetics.ts src/components/tutorial/TutorialGame.tsx src/app/admin/shop/AdminShopClient.tsx git-commit303.bat
git commit -m "feat(avatars): kvadratinis ornate rEmas + idle video. AvatarFrame perdarytas: vietoj apvalaus pic + HpVial flask -> kvadratinis frame.png remas (baltas fonas iskirptas flood-fill -> permatomas; backup frame_orig.png), portretas centre (vidinio lango insets is analizes T29/L28.5/R28/B33%), HP skaicius ant apatinio skydo (flask pasalintas). Idle video: jei avataras turi video, jie atsitiktinai groja vietoj portreto kas 20-60s (onEnded -> revert + reschedule). Migracija 20260731: cosmetics.videos jsonb + avatar-video bucket (mp4/webm 10MB) + rvn_get_cosmetics grazina videos. cosmetics.ts Cosmetic.videos + BattleAvatar.videos. Admin AvatarsTab: AdminAvatarVideos - multiple video ikelimas/preview/trynimas. tsc svarus."
git push
) > commit303.log 2>&1
