import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-green': {
          DEFAULT: '#10B981',
          '50': '#E6F8F2',
          '100': '#D1F4E9',
          '200': '#A8E9D3',
          '300': '#7FDEBD',
          '400': '#56D3A7',
          '500': '#2CC891',
          '600': '#10B981',
          '700': '#0E9F6F',
          '800': '#0B855D',
          '900': '#096B4B',
          '950': '#054733',
        },
      }
    },
  },
  plugins: [],
}

export default config