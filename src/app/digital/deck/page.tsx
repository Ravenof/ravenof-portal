import { redirect } from 'next/navigation'

export default function DigitalDeckRedirect() {
  redirect('/digital/decks?tab=builder')
}
