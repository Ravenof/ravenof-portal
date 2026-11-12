import { redirect } from 'next/navigation'

// 773: 2v2 idėjos atsisakyta – maršrutas nebepasiekiamas (buvo atidaromas tik įvedus adresą ranka).
export default function Page() {
  redirect('/digital')
}
