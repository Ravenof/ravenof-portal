@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add public/sounds/battle/battlecry-sting.mp3 public/sounds/battle/buff.mp3 public/sounds/battle/debuff.mp3 public/sounds/battle/fatigue.mp3 public/sounds/battle/lastwish-sting.mp3 public/sounds/battle/reaction-set.mp3 public/sounds/battle/return-hand.mp3 public/sounds/battle/shield-break.mp3 public/sounds/battle/shield-up.mp3 public/sounds/battle/status-burn.mp3 public/sounds/battle/status-poison.mp3 public/sounds/battle/status-silence.mp3 public/sounds/battle/status-stun.mp3 public/sounds/battle/trigger-sting.mp3 public/sounds/battle/turn-end.mp3 public/sounds/battle/turn-start.mp3 public/sounds/battle/turn-start-enemy.mp3
git add src/lib/game/soundManifest.json src/lib/version.ts git-commit760.bat
git commit -m "760: 17 nauju kovos garsu (buff, debuff, turn-start, turn-start-enemy, turn-end, return-hand, shield-up, shield-break, status-burn/poison/stun/silence, reaction-set, battlecry/lastwish/trigger sting, fatigue) - apkarpyta tyla ir ilgis, mono 44.1 kHz, suvienodintas garsumas; priesininko ejimo signalas pazemintu tonu, kad skirtusi nuo savo ejimo; atnaujintas garsu manifestas; APP_VERSION 760" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit760.log 2>&1
