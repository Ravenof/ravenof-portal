import { getServerT } from '@/lib/i18n/server'
import { AccountLevelScreen } from '@/components/digital/profile/AccountLevelScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('profile.level.screenTitle')} | Ravenof Digital` }
}
export default function Page() { return <AccountLevelScreen /> }
