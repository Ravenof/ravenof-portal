import type { Metadata } from 'next'
import { LifeTrackerClient } from './LifeTrackerClient'

export const metadata: Metadata = { title: 'Kova' }

export default function LifeTrackerPage() {
  return <LifeTrackerClient />
}
