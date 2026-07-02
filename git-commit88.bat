@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx & git commit -m "feat(aura): pasyvi statu aura - kol korta kovos lauke buffina padarus (+ATK/+HP, scope savo/prieso/visi, potipio filtras, includeSelf); idempotentinis recomputeAuras po summon/zuties/nutildymo/ejimo pab.; admine aura editorius" & git push ) > commit88.log 2>&1
