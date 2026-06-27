@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260709_campaign_canon_fields.sql
git add src/lib/campaign/seedTypes.ts src/lib/campaign/seedRebuild.ts
git add src/lib/campaign/types.ts src/lib/campaign/missionLoader.ts src/lib/campaign/validate.ts
git add src/data/campaignSeeds/prazarasVarngradasCampaign.ts
git add src/components/admin/campaign/AdminCampaignsList.tsx
git add src/components/admin/campaign/AdminNodeEditor.tsx
git add src/components/admin/campaign/AdminCampaignEditor.tsx
git add CAMPAIGN_MODE.md git-commit260.bat
git commit -m "feat(campaign): kanono turinio perdarymas - 'Prazaro kilme: Varngrado uzrakinimas' (18 mazgu pagal Varngrado novele/Atlasa). Saltiniai: Ravenof_Varngradas_Atlaso_gaires.xlsx + skyriai (Prologas, IV, VIII, XIV, XVI, Epilogas perskaityti pilnai; likusiems naudota Atlaso ivykiu lentele). Naujas seed failas src/data/campaignSeeds/prazarasVarngradasCampaign.ts (campaign + 4 skyriai + 18 mazgu su mission types/objectives/scenario/rewards/canon fields + perrasyti cutscenes Ravenof balsu + 3 deck paketai + Demonu ordos enemy paketai). DB: 20260709 prideda kanono laukus (source_chapter/source_event_ids/canon_summary/canon_characters/canon_locations) + seed_key. Admin: NodeEditor '📖 Kanonas' tab; kampaniju sarase 'Seed/Rebuild' (Saugus sujungimas - nesugadina rankiniu edit'u / Pilnas perrasymas). seedRebuild.ts safe-merge pagal seedKey. Validacija: aktyvus mazgas turi skyriu; svarbus mazgas turi cutscene; FINALAS - Belzatoras ATSITRAUKIA, ne zusta; Varngradas raso darna; Prazaras ne nemireles sioje noveleje. Naming: standartizuota i kanona 'Varngradas' (pasaulis=Ravenoras); sena generine pavyzdine kampanija pasalinama per Pilna perrasyma. KANONAS: Prazaras=MARSALAS (ne kapralas, pagal Atlasa); Belzatoras (ne Belzoras); pabaiga=pergale ir laidotuves. RIBOS: story-deck kortos kol kas tik dizainas (mūšiai vyksta su kolekcijos kaladе vs Demonu orda frakcija); gilus bangu/vartu HP integravimas - extension point; asset upload - URL slotai paruosti. tsc+eslint svaru. SVARBU: paleisti 20260709 migracija; Drive 'APP' aplanke atviras Firebase service-account raktas - rotuoti. Docs: CAMPAIGN_MODE.md."
git push
) > commit260.log 2>&1
