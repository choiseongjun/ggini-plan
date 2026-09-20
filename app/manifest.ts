import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '끼니플랜',
    short_name: '끼니플랜',
    description: '내 예산에 맞는 장보기와 식단을 간편하게 챙겨요.',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fffdf7',
    theme_color: '#fffdf7',
    icons: [
      { src: '/icons/app-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/app-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
