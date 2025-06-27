// pages/_app.tsx
// Import your global CSS file here
// Assuming global.css is in a 'styles' folder sibling to 'pages'
import '../styles/global.css';

import type { AppProps } from 'next/app';
import React from 'react'; // React import is good practice

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}