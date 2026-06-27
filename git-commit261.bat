@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260710_campaign_varngradas_cards.sql
git add src/data/campaignSeeds/prazarasVarngradasCampaign.ts
git add src/lib/campaign/seedRebuild.ts
git add CAMPAIGN_MODE.md git-commit261.bat
git commit -m "feat(campaign): line-level cutscene perdarymas + campaign-only kortos. Perskaityti VISI 18 skyriu (Drive); cutscenes perrasyti su autentiskomis (beveik pazodinemis) novelės replikomis kiekvienam mazgui (Konstancijus 'Liudiju', Belzatoras 'kapas su ginklais', Velnio advokatas 'sudauzete inda, bet ne alki', finalas 'Vardas?/Prazaras. Varngrado marsalas./Pareiga?/Laikyti'). KANONO FIX: Saldas zusta XI skyriuje (ne X) - node10=pirmas Belzatoro suzeidimas (vartai griuva, grandines, zibintai), Saldas gyvas; node11=paaukota zona + Saldos ietis i zaizda + mirtis. Kortos (20260710): 49 realios cards eilutes VRN-001..VRN-109, status active - 3 deck paketai (Varngrado gynejai/Triju jegu frontas/Varngrado Uzraktas) + Demonu ordos paketas (Impas..Belzatoras bosas). Naudoja gyvas frakcijas (Universalus/Inkvizicijos legionas/Sviesos pulkas/Demonu orda), realius tipus (Padaras/Burtas/Cempionas/Reakcija/Artefaktas/Laukas) ir rangus; variklis isveda keywordus is effect_text. Migracija sukuria 3 story kalades (owner=pirmas admin) + deck_cards; seedRebuild dabar resolvina storyDeckPackage->deck id ir nustato battle_config.storyDeckId + playerDeckMode='story' (kanono kalade, ne atsitiktine kolekcija). RIBOS: gilesni efektai/cempiono skill mygtukai reikalauja cards.gameplay JSONB (admin Gameplay editorius). tsc+eslint svaru. Paleisti 20260710 PO 20260707-09; tada Seed/Rebuild. Docs: CAMPAIGN_MODE.md."
git push
) > commit261.log 2>&1
