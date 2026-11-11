@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/RollingNumber.tsx src/components/tutorial/BattleIcons.tsx src/lib/game/types.ts src/lib/game/soundManager.ts src/lib/ui-sound.ts src/lib/game/effectAnimations.ts src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit761.bat
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/cards/gameplayLint.ts src/components/admin/GameplayConfigEditor.tsx src/locales/lt/battleLog.json src/locales/en/battleLog.json scripts/simulate-combat-rules.ts scripts/simulate-virtual-game.ts supabase/migrations/20261111b_map_unconfigured_cards.sql git-commit762.bat
git commit -m "762: GAME JUICE - riedantys HP ir aukso skaiciai, paskutinio smugio prozektorius su muzikos nutildymu, pergales/pralaimejimo akcentai, zemo HP sirdies plakimas. EMOJI VALYMAS - linijines ikonos vietoj emoji (klaida, pasukimas, perziura), statusu tiko zenklas per FX daleles, taikymo kursorius ir pasirinkimo etiketes be emoji ir per i18n, pasalintas negyvas emoji projektilu kodas ir effectAnimationMap. NAUJOS MECHANIKOS - attackWithShield (puldamas turi Magiska skyda), attackKeepsStealth (puldamas turi Selinima), noRetaliationDamage (negauna atgalines zalos), summonAlias (gali buti iskviestas vietoje X), passiveAura auraZmkRemapFrom/To (ZMK A veikia kaip B), efektas refreshAttacks (jau puole padarai puola dar karta + traukimas); admin varneles ir laukai; migracija 20261111b_map_unconfigured_cards.sql (14 kortu). QA - cempiono korta, kurios fazes dabar negalima nei evoliucionuoti, nei iskeisti, rankoje pritemdoma is anksto; test game:test:combatrules 38; APP_VERSION 762" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit762.log 2>&1
