import { FriendsClient } from '@/components/social/FriendsClient'
import { RequireUser } from './RequireUser'
export default function FriendsScreen() { return <RequireUser>{() => <FriendsClient />}</RequireUser> }
