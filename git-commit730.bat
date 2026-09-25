@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/onboarding/StarterDeckOnboarding.tsx src/lib/digital/onboarding.ts src/lib/economy.ts supabase/migrations/20261002_cross_format_matchmaking.sql src/components/digital/ui/CrossFormatOffer.tsx src/components/digital/ranked/RankedQueue.tsx src/components/digital/DigitalPvP.tsx src/lib/ranked/client.ts src/locales/lt/battle.json src/locales/en/battle.json tsconfig.check.scene.json src/lib/version.ts git-commit730.bat
git commit -m "730: Kryzminis (ZMK <-> Klasika) matchmaking'as - kai mano formate niekas nelaukia, o kitame yra zaidejas, rodomas pasiulymas (CrossFormatOffer); sutikus formatas perjungiamas ir ATOMISKAI prisijungiama prie TO zaidejo: reitinge rvn_queue_poll grazina otherFormat (rango spindulys kitame sezone) + rvn_queue_switch (for update, dvigubo 'taip' lenktynes sprendzia uzraktai), draugiskoje - salyginis prisijungimas prie kito formato kambario + savo kambario salyginis trynimas (jei i mano jau prisijunge - liekam host'u); boto fallback pristabdomas kol pasiulymas atidarytas; atmetus - 30 s nebesiuloma (migracija 20261002, paleisti pries release). + Onboarding fix: dezutes dydis is realaus konteinerio aukscio (nebesikerpa virsus), tikros frakciju ikonos (ravenof-ui), inspectDeck i18n raktas; reportMatchV2 fallback be p_format jei DB dar be migracijos 20261001 (dienos uzduotys vel uzsiskaito)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit730.log 2>&1
