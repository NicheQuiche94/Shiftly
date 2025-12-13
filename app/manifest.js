export default function manifest() {
    return {
      name: 'Shiftly',
      short_name: 'Shiftly',
      description: 'AI-powered staff scheduling',
      start_url: '/employee',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ec4899',
      orientation: 'portrait',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    }
  }