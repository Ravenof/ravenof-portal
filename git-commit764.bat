@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/BattleLogList.tsx src/lib/game/effectEngine.ts src/locales/lt/battleLog.json src/locales/en/battleLog.json src/lib/version.ts git-commit763.bat git-commit764.bat
git add src/lib/game/fxStage.ts src/app/dev/fx/page.tsx public/digital/fx/README.md public/digital/fx/explosion.webp public/digital/fx/mist.webp public/digital/fx/flame.webp public/digital/fx/scorch.webp public/digital/fx/star.webp public/digital/fx/halo.webp public/digital/fx/ray.webp public/digital/fx/shock.webp
git commit -m "764: FX PILOTAS - tikros ugnies ir dumu teksturos (flipbook) vietoj vien proceduriniu daleliu: fxStage gavo kadru juostu ir teksturu varikli (book/stamp, spalvinimas, tingus krovimas) ir naujas fireBurst, iceShatter bei holyDescent versijas; jos ijungiamos tik per fxStage.books(true) - zaidime kol kas groja senieji efektai. /dev/fx puslapyje naujas blokas: tas pats efektas senas ir naujas is eiles + varnele. Teksturos CC0 (Unity Labs VFX Image Sequences, Kenney Particle Pack) public/digital/fx, apie 0.65 MB. KARTU 763: kovos zurnalas - spalvoti emoji pakeisti UI rinkinio vaizdais ir vienspalviais zenklais, thenTargetGone pranesimas kai 'tada' dalies taikinys ka tik zuvo; APP_VERSION 764" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit764.log 2>&1
