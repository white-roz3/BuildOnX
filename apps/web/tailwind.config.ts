import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm stone backgrounds
        bg: {
          main: '#1c1917',      // stone-950 - main background
          card: '#292524',      // stone-800 - cards/inputs
          hover: '#44403c',     // stone-700 - hover states
        },
        // Orange accent - VIBRANT, not muddy
        accent: {
          DEFAULT: '#ea580c',   // orange-600 - primary accent
          hover: '#c2410c',     // orange-700 - hover state
          light: '#fb923c',     // orange-400 - light text
        },
        // Text colors
        text: {
          primary: '#fafaf9',   // stone-50
          secondary: '#a8a29e', // stone-400
          muted: '#78716c',     // stone-500
        },
        // Borders
        border: {
          DEFAULT: '#44403c',   // stone-700 - visible
          subtle: '#292524',    // stone-800 - subtle
        },
        // Status
        status: {
          live: '#22c55e',      // green-500
          warning: '#ea580c',   // orange-600
          error: '#ef4444',     // red-500
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
