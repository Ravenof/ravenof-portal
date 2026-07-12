import { getServerT } from '@/lib/i18n/server'
import { DigitalPvE } from '@/components/digital/DigitalPvE'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('navigation.pve')} | Ravenof Digital` }
}
export default function Page() { return <DigitalPvE /> }
