@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/game/cinematics.ts src/lib/game/cinematicQueue.ts src/lib/settings.ts src/lib/tutorial/engine.ts src/components/tutorial/RavenofCinematicOverlay.tsx src/components/tutorial/TutorialGame.tsx src/components/admin/CinematicUpload.tsx src/components/admin/GameplayConfigEditor.tsx src/components/digital/SettingsModal.tsx supabase/card_cinematics_v1.sql git-commit256.bat
git commit -m "feat(cinematics): PremiumCinematics - kino pop-up sistema (summon + Cempiono skill). Naujas card-cinematics bucket (WebM->MP4->poster, tik URL DB). Admin: Summon Cinematic sekcija + kiekvienam is 3 skillu atskiras kino (CinematicUpload widget, preview/replace/delete, validacija). Bendra eile (useCinematicQueue - be persidengimo, cap, dedupe), RavenofCinematicOverlay (themed remas, skip 0.5s, reduced-motion static, video cleanup). Trigeriai TutorialGame: summon (Legendinis/Cempionas) per play/champion event; skill per ability event (e.skillIndex) PO taikinio - nekeicia zaidimo busenos. Nustatymai: premium/summon/skill jungikliai. Deck posteriu preload, video lazy. tsc svarus."
git push
) > commit256.log 2>&1
