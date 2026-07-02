@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add public/digital/ui3 public/digital/icons
git add src/components/digital/ui/HubKit.tsx src/app/digital/layout.tsx src/app/digital/friends/page.tsx
git add src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/DigitalCoop.tsx
git add src/components/digital/MoreScreen.tsx src/components/digital/DigitalCollection.tsx src/components/digital/DigitalDecks.tsx
git add src/components/digital/StoreModal.tsx src/components/digital/QuestsModal.tsx src/components/digital/SeasonPassModal.tsx
git add src/components/digital/campaign/CampaignList.tsx src/components/digital/ranked/RankedClient.tsx src/components/tutorial2/TutorialHub.tsx
git commit -m "feat(ui): dark-fantasy asset paketo integracija visiems /digital puslapiams. Nauji apdoroti assets (chroma-key permatomumas): public/digital/ui3 (hero, heading, CTA, logo, divider, mode/QA korteles) + public/digital/icons (nav glifai, 13 feature ikonu, avatar, flame, bell). HubKit: ASSET->ui3, PageHero (pilnas+compact) bendra sub-puslapiu antraste su divider, GoldPlate CTA, RewardChip/MiniReward img parametrai. Layout: logo asset, resource pills su fi-coins/fi-gifts, nav glifu gold-ify filtrai. Suvienodinti: Hub, PvE, PvP, Coop, Ranked, Kampanija, Kolekcija, Kalades, Draugai, Daugiau, Mokymai, Store/Quests/Season modalai. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit324.log 2>&1
