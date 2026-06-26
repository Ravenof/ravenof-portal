@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260707_campaigns.sql supabase/migrations/20260708_campaign_prazaras_seed.sql
git add src/lib/campaign
git add src/components/digital/campaign
git add src/app/digital/campaign
git add src/components/admin/campaign
git add src/app/admin/campaigns
git add src/components/tutorial/TutorialGame.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/admin/page.tsx
git add CAMPAIGN_MODE.md git-commit259.bat
git commit -m "feat(campaign): Campaign Mode - generic, data-driven vieno zaidejo istorijos sistema. DB: campaigns/chapters/nodes/cutscenes/progress + RLS + RPC (rvn_campaign_state, rvn_campaign_complete_node, rvn_campaign_mark_cutscene; atlygis per esama rvn__grant_payload). Lib (src/lib/campaign): types, scenarioEngine (triggeriai->efektai, objective scoring 1-3 zvaigzdes), waveEngine (turn-based bangos), missionLoader (Supabase IO + node-state), validate. Zaidejas: Kampanija plytele DigitalHub'e -> /digital/campaign (sarasas) + /digital/campaign/[slug] (Atlas zemelapis su mazgais, mission intro, cutscene player, CampaignRuntime: pre-cutscene->kova->post/fail-cutscene->atlygis->unlock; progresas issaugomas per useri). Admin: /admin/campaigns (sarasas+kurimas) + redaktorius (Nustatymai/Zemelapis ir mazgai/Cutscenes/Validacija; map editor - deti/tempti/jungti mazgus; node editor su friendly laukais + Advanced JSON; cutscene editor; validacija). TutorialGame: pridetas optional onCampaignResult prop (be jo - elgesys nepakites, 0 regresijos standartinem kovom). Sample: 'Prazaro kilme: Varnagrado uzrakinimas' (4 skyriai, 12 misiju: story-only/standard/ambush/gate/wave/boss/branch/wall/survival; Demonu orda priesas, Inkvizicijos legionas/Sviesos pulkas parama; cutscenes pre/post; custom objectives; rewards). tsc svarus, eslint be klaidu (tik img warnai kaip esamame kode). Docs: CAMPAIGN_MODE.md. SVARBU: paleisti 2 migracijas Supabase (20260707 tada 20260708)."
git push
) > commit259.log 2>&1
