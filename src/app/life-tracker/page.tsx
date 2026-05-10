import type { Metadata } from 'next'
import { LifeTrackerClient } from './LifeTrackerClient'

export const metadata: Metadata = { title: 'Life Tracker — Ravenof' }

export default function LifeTrackerPage() {
  return <LifeTrackerClient />
}
