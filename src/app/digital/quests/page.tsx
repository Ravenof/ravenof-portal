import { getServerT } from '@/lib/i18n/server'
import { DailyQuestsScreen } from '@/components/digital/progression/DailyQuestsScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('progression.quests.screenTitle')} | Ravenof Digital` }
}
export default function Page() { return <DailyQuestsScreen /> }
