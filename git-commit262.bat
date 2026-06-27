@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260711_campaign_card_gameplay.sql
git add CAMPAIGN_MODE.md git-commit262.bat
git commit -m "feat(campaign): kortu gameplay JSON - efektai realiai veikia musyje. 20260711 nustato cards.gameplay (~38 kortu) pagal src/lib/game/types.ts GameplayConfig: battlecry (onSummon) zala/gydymas/silence/freeze/auksas; deathrattle (onDeath) buff/zala (Saldas +1/+1, Konstancijus +0/+2, Maro kirminas); burtai (onCast) AoE zala/buff (Akmenys, Balta sviesa 3+1sau, Grandines ir balista 6 bosui, Uzrakintuju sprendimas, Paskutine rikiuote); statiniai keywords/auros (taunt/sprint/stealth, Gunterio +1 atk aura); CEMPIONO skilai - Prazaras (Kelkite vartus/Rikiuote prie sienos/Niekas nepalieka spragos) ir bosas Belzatoras (Kirvio smugis/Juodo dumo banga/Plysio riaumojimas), champion_phase=3. Safe-merge (raso tik kur gameplay tuscias). Prideda gameplay/subtype/champion_group/champion_phase stulpelius if not exists. Visi 40 JSON validuoti (effect/trigger/target vardai is schemos). Paleisti PO 20260710. Likusias kortas (laukai) galima praturtinti admin Gameplay editoriuje. Docs: CAMPAIGN_MODE.md."
git push
) > commit262.log 2>&1
