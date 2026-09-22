@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/timing.ts src/lib/tutorial/engine.ts src/lib/game/triggerSystem.ts src/lib/game/reactionPacing.ts src/lib/settings.ts src/lib/version.ts src/components/digital/SettingsModal.tsx src/components/tutorial/SceneFxLayer.tsx src/components/tutorial/KeywordFxLayer.tsx src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleLayout.tsx src/components/tutorial/DesktopBattleLayout.tsx src/app/dev/scene-fx/page.tsx src/app/dev/keyword-fx/page.tsx src/locales/lt/settings.json src/locales/en/settings.json src/locales/lt/battle.json src/locales/en/battle.json scripts/simulate-scene-gates.ts tsconfig.check.scene.json package.json ravenof-fx-preview-zmk-keywords.html ZMK-IR-RAKTAZODZIU-FX-PLANAS.md git-commit714.bat
git commit -m "714: kovos scenos su vartais - ZMK korta atskrenda is kalades prie taikinio (flip, zala tik po skrydzio, rezultatas 2.5s) + Kovos suksnio / Paskutinio noro / Trigerio scenos (paskelbimas prie saltinio, kelias, antspaudas ant taikinio); variklio snapshot vartai kaip reakciju (reactionGates.kind), jungiklis Nustatymuose 'Kovos scenos', /dev/scene-fx perziura, game:test:scenes 34 patikros" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit714.log 2>&1
