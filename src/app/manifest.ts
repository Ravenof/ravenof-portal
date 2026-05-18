import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Ravenof Portalas',
    short_name:       'Ravenof',
    description:      'Ravenof kortų duomenų bazė, kaladžių kūrimas, renginiai, turnyrai ir HP sekiklis.',
    start_url:        '/',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait',
    background_color: '#05060a',
    theme_color:      '#f2a20c',
    lang:             'lt',
    categories:       ['games', 'entertainment', 'utilities'],
    icons: [
      {
        src:     '/icons/icon-192.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icons/icon-512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icons/maskable-512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name:      'HP Sekiklis',
        short_name:'HP Sekiklis',
        url:       '/life-tracker',
        description: 'Gyvybių sekiklis ir kovos režimas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name:      'Kortų bazė',
        short_name:'Kortos',
        url:       '/cards',
        description: 'Ravenof kortų duomenų bazė',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
