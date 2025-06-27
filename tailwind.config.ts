import type { Config } from 'tailwindcss'

const config: Config = {
  // This 'content' section is the most important part.
  // It tells Tailwind where to look for your class names.
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // If you have an `app` directory for routing, add this line too:
    // './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config