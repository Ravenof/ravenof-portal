@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/campaign/CampaignMap.tsx
git add src/components/digital/campaign/CampaignMapScreen.tsx
git add src/components/digital/DigitalPvE.tsx
git add src/components/digital/DigitalPvP.tsx
git add src/components/digital/DigitalCoop.tsx
git add src/components/digital/DigitalPvp2v2.tsx
git add src/components/digital/PvPLobby.tsx
git add src/components/digital/DigitalMyDecks.tsx
git add src/lib/ranked/client.ts
git add supabase/migrations/20260712_campaign_progress_fix.sql
git add supabase/migrations/20260713_campaign_hide_from_main.sql
git add git-commit264.bat
echo === Commit ===
git commit -m "fix(campaign): progreso bug fix migr + full-screen sklandus zemelapis + slepti kampanijos kortas/kalades is main. (1) 20260712: campaign_mission pridetas i xp_transactions CHECK + complete_node atlygis apgaubtas exception-saugiu bloku (atlygis nebelauzo progreso/atrakinimo - STORY_ONLY dabar atrakina kita mazga). (2) CampaignMap perrasytas: pildo teva (full-bleed), sklandus pan/zoom (anchored wheel/pinch, double-tap, zoom mygtukai, recenter), didesni mazgai. CampaignMapScreen: full-screen konteineris tarp header/nav su plūduriuojancia antraste. (3) Deck pickeriai (PvE/PvP/Coop/2v2/PvPLobby/MyDecks/ranked client/campaign) isskiria '[Kampanija]%' kalades. (4) 20260713: VRN kortos status=hidden (dingsta is main kolekcijos/builderio, kampanija kraunama per deck_cards), [Kampanija] kalados visibility=private (dingsta is community). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
