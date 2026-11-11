@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/engine.ts src/lib/game/targetResolver.ts src/lib/game/triggerSystem.ts src/lib/game/types.ts src/lib/pvp/guard.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx src/lib/version.ts scripts/simulate-combat-rules.ts scripts/simulate-pvp-guard.ts scripts/simulate-sound-manifest.ts package.json supabase/migrations/20261111_remap_dead_triggers.sql
git add src/lib/sfxPlayer.ts src/lib/ui-sound.ts src/lib/game/soundManager.ts src/lib/game/soundManifest.json src/lib/game/statusVfx.ts src/lib/game/impactProfiles.ts src/components/tutorial/SceneFxLayer.tsx tools/gen-sound-manifest.mjs public/sounds/battle/README.md public/sounds/battle/puff.mp3 public/sounds/battle/gold-1.mp3 public/sounds/battle/gold-2.mp3 public/sounds/battle/gold-3.mp3
git add git-commit754.bat git-commit755.bat git-commit756.bat git-commit757.bat
git commit -m "757: Auditas 2026-11-11 - ENGINE: atakos zala eina per zalos mazinimo aura, lauko pirmos zalos mazinima, vampyrizma, onAnyDamage, retreatAtHp ir Isiuti; nutildytas puolejas nevykdo onAttack; apnuodytas puolejas i zaideja per bendra kelia; degimo/nuodu tikas nebepataiko i zuvusi padara; aura nuimama po atideto prisikelimo; nezinomas target nebelauzia veiksmo; susaldyto zurnalo dublis; 2v2 seat; laikinas +HP baigdamasis gyvybes neatima; Paskutinio noro iskvietimas pilnoje lentoje gauna mirstancio padaro vieta; onAnyDamage/onAnyHeal su triggerOnSelfTarget ir oncePerTurn + admin varneles; migracija 20261111_remap_dead_triggers.sql (11 kortu). PVP: host tikrina svecio veiksmus (src/lib/pvp/guard.ts), endTurn tik aktyviai pusei, reject sveciui su priezastimi. GARSAS: garsu manifestas vietoj failu vardu spejimo (tools/gen-sound-manifest.mjs, soundManifest.json, prebuild/predev), bendras sfxPlayer su WebAudio buferiais (persidengimas, pitch variacija, HTMLAudio atsarga), 19 nauju kovos garso raktu su fallback i esamus garsus arba sinteze (puff, buff, debuff, gold, turn-start, turn-end, return-hand, shield-up/break, status-*, reaction-set, sting'ai, fatigue), puff.mp3 ir gold-1..3.mp3. Testai game:test:combatrules, game:test:pvpguard, game:test:sounds; APP_VERSION 757" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit757.log 2>&1
