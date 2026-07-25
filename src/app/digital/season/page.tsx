import { getServerT } from '@/lib/i18n/server'
import { SeasonPathScreen } from '@/components/digital/progression/SeasonPathScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('progression.season.screenTitle')} | Ravenof Digital` }
}
export default function Page() { return <SeasonPathScreen /> }
