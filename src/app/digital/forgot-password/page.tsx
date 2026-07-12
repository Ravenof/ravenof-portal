import { getServerT } from '@/lib/i18n/server'
import { DigitalForgotPassword } from '@/components/digital/onboarding/DigitalForgotPassword'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('navigation.forgotPassword')} | Ravenof Digital` }
}
export default function Page() { return <DigitalForgotPassword /> }
