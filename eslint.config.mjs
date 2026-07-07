// ── ESLint v9 flat config (FlatCompat aplink seną next extends) ──────────────
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

export default [
  {
    ignores: [
      'node_modules/**', '.next/**', 'out/**', 'android/**', 'android-shell-template/**',
      'mobile-shell/**', 'video-in/**', 'video-out/**', 'tools/img-report/**',
      '_fx_backup_20260625-1449/**', 'public/**', 'card-images-import/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]
