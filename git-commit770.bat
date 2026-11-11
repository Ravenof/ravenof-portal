@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/ai/aiTypes.ts src/lib/tutorial/ai/aiEngine.ts src/lib/tutorial/ai/aiMaster.ts src/lib/tutorial/ai/aiDeckBuilder.ts src/components/tutorial/TutorialGame.tsx src/locales/lt/battle.json src/locales/en/battle.json scripts/simulate-ai-difficulty.ts scripts/simulate-ai-ladder.ts src/lib/game/fxStage.ts src/lib/game/statusVfx.ts src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/version.ts scripts/sweep-cards.ts scripts/sweep-cases.ts package.json supabase/migrations/20261111c_fix_dead_card_effects.sql git-commit770.bat
git commit -m "770: korteliu efektu pataisos po patikros variklyje. (1) buffHealth i zaideja (+X HP cempionui) dabar veikia: prideda HP ir prireikus pakelia maksimuma (9 kortos nieko nedarydavo). (2) artefakto onDeath efektai suveikia ji sunaikinus (Sprogiosios statines). (3) naujas destroy + activeField: panaikina aktyvu lauka (Iseinam). (4) migracija 20261111c: Sprogstanti magija ir Stichiju skydas - onAnyCast, Dumu uzdanga ir Meditacija - burtai, Kapiniu zibintas, Mergele Liliana, Iseinam, Sventintas vanduo pagal kortos teksta. (5) sweep skriptai: skelbimas nelaikomas pokyciu, tiksliniai scenarijai. (6) NASUMAS telefonuose: lietimo irenginiai visada taupiame FX rezime (drobe 1x tankiu vietoj 2x, puse daleliu), nuolatiniai statusai taupiame rezime piesiami ~30 k/s, automatinis perejimas i taupu rezima kai kadrai stabiliai leti. (7) DI LYGIAI pakelti per laipteli: easy = buves normal, normal = buves hard (Didmeistris), hard = Legenda - platesne ir gilesne paieska, keli ZMK scenarijai, garantuotas lethal pirmas; Sunkus DI be paruostos kalades pats susistato kalade pagal archetipa, sinergijas ir aukso kreive (aiDeckBuilder). Telefonuose trumpesnis DI mastymo biudzetas. APP_VERSION 770" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit770.log 2>&1
