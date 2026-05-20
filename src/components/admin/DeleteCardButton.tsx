'use client'
import { DeleteButton } from './DangerButtons'
import { deleteCard } from '@/app/admin/cards/actions'
import { useRouter } from 'next/navigation'

export function DeleteCardButton({ cardId }: { cardId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      label="Ištrinti"
      onConfirm={async () => {
        const res = await deleteCard(cardId)
        if (res.error) throw new Error(res.error)
        router.refresh()
      }}
    />
  )
}
