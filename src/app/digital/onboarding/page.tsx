import { getServerT } from '@/lib/i18n/server'
import { StarterDeckOnboarding } from '@/components/digital/onboarding/StarterDeckOnboarding'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('navigation.onboarding')} | Ravenof Digital` }
}
export default function Page() { return <StarterDeckOnboarding /> }
