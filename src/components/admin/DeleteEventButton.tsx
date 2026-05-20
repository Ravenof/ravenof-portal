'use client'
import { DeleteButton } from './DangerButtons'
import { deleteEvent } from '@/app/admin/events/actions'
import { useRouter } from 'next/navigation'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  return (
    <DeleteButton
      label="Ištrinti"
      onConfirm={async () => {
        const res = await deleteEvent(eventId)
        if (res.error) throw new Error(res.error)
        router.refresh()
      }}
    />
  )
}
