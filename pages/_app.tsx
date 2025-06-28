// pages/_app.tsx
import '../styles/global.css';
import type { AppProps } from 'next/app';
import React, { useEffect } from 'react'; // React import is good practice

export default function MyApp({ Component, pageProps }: AppProps) {
  // This effect runs on the client to set the theme based on system preference.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply theme on initial load
    applyTheme(mediaQuery.matches);

    // Listen for changes in system preference
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return <Component {...pageProps} />;
}