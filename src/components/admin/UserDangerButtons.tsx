'use client'
import { DeleteButton, BanButton } from './DangerButtons'
import { deleteUser, setBanStatus } from '@/app/admin/users/actions'
import { useRouter } from 'next/navigation'

export function UserDangerButtons({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <BanButton
        userId={userId}
        isBanned={isBanned}
        onToggle={async (id, ban) => {
          const res = await setBanStatus(id, ban)
          if (res.error) throw new Error(res.error)
          router.refresh()
        }}
      />
      <DeleteButton
        label="Ištrinti"
        onConfirm={async () => {
          const res = await deleteUser(userId)
          if (res.error) throw new Error(res.error)
          router.refresh()
        }}
      />
    </div>
  )
}
