@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalDecks.tsx src/components/digital/DigitalMyDecks.tsx src/components/digital/DigitalDeckBuilder.tsx
git add src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/DigitalCollection.tsx src/components/digital/PackOpen.tsx
git add src/components/admin/UserRoleForm.tsx src/app/admin/users/actions.ts
git commit -m "feat(ui): 6 pataisymai. 1) Kaladziu tabs perdaryti i dark-fantasy oktagonus (aukso remelis+glow aktyviam, Cinzel) - nebe out of place. 2) Mano kalades: fizine kortu susnis (2 sluoksniai uz nugaros + atspindys) + parchment lapukas uzklijuotas ant lentynos (pavadinimas, frakcija, 'N kortu' be max, lipni juostele), lenta perdengia lapukus; drawer StatBox be /30. 3) TESTER role: adminas suteikia per admin/users (role select + whitelist), testeris/adminas deck builderyje stato is VISU kortu (ownedOf=99, TESTER badge antrasteje) ir gali zaisti PvE/PvP bet kokia kalade. 4) 1 kopija = max 1 i deck grieztai (canAdd zinute 'Turi tik xN - daugiau isideti negali'). 5) Kolekcijos knyga: SOLID lapo vertimas - senas lapas nepermatomas (savo fonu) verciasi per nugarele virs naujo (popLayout, origin spine, rotateY 165), nebe korteliu suskleidimas. 6) Boosterio atplesimas: nebera cheap sticker - plesiasi PATI pakuotes viruja ties pirstu: kandziotas krastas seka pirsto x, folijos gabalas kyla/sukasi nuo piršto, atsiveria vidus su svytejimu, atleides <42%% grizta, perplesus folija nuskrieja su fizika. tsc+eslint svarus"
git push
git log -1 --oneline
) > commit334.log 2>&1
