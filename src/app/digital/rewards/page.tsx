import { getServerT } from '@/lib/i18n/server'
import { LoginRewardsScreen } from '@/components/digital/progression/LoginRewardsScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('progression.login.screenTitle')} | Ravenof Digital` }
}
export default function Page() { return <LoginRewardsScreen /> }
