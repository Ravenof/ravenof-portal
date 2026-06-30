@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/avatarAudio.ts src/components/tutorial/TutorialGame.tsx git-commit300.bat
git commit -m "feat(avatars): 2 etapas - battle integracija. AvatarAudioManager (avatarAudio.ts): playAvatarAudio weighted-random + rate-limit (hit 1.8s/spellCast 2s) + once-per-battle (fightStart/defeat/victory/lowHp), vienas balso kanalas, gerbia SFX volume, preload. AvatarFrame komponentas: portretas (img + emoji fallback), owner akcentas (player gold/zalia / enemy violet/raudona), HP per HpVial, damage shake + red/heal flash. hpBar dabar rodo AvatarFrame -> avataras automatiskai teisingose pusese (desktop kaire/desine rail, mobile virsus/apacia, NE top HUD); islaiko data-player target/glow/picked. Krovimas battle pradzioje: equipped avatar (getCosmetics) + enemy default + getAvatarAudio -> setAvatarAudioMap. Garsai prijungti: fightStart (turn owner pirmas), hit + lowHp + float skaicius + flash kai zaidejas gauna zala, defeat/victory per win, spellCast per burta, heal flash. tsc svarus."
git push
) > commit300.log 2>&1
