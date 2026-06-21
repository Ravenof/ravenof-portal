@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260624_digital_settings.sql src/lib/settings.ts src/lib/settings-sync.ts src/lib/game/musicManager.ts src/lib/ui-sound.ts src/lib/game/soundManager.ts src/lib/game/voiceManager.ts src/lib/ranked/sound.ts src/components/tutorial/TutorialGame.tsx src/components/digital/SettingsModal.tsx src/components/digital/DigitalHub.tsx src/app/digital/layout.tsx git-commit187.bat
git commit -m "feat(settings): Digital meniu nustatymai - atskiri muzikos ir SFX garsumo slankikliai + summon efektu jungiklis; issaugoma per vartotoja (localStorage + profiles.digital_settings DB sync), prisimena ir kitame irenginyje. Muzika gyvai reaguoja i garsuma; SFX/voice/ranked garsai skaliuojami; summon FX gating TutorialGame"
git push
) > commit187.log 2>&1
