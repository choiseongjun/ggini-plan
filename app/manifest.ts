import type { MetadataRoute } from 'next';
import {brandCopy} from '../lib/brand-copy';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '끼니플랜',
    short_name: '끼니플랜',
    description: brandCopy.description,
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
