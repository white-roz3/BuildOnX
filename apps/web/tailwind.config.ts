import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mars-inspired warm palette
        mars: {
          50: "#fef7f0",
          100: "#f5e6d3",
          200: "#e8cdb0",
          300: "#d4a574",
          400: "#c17f59",
          500: "#a65d3f",
          600: "#8b4a35",
          700: "#6d3a2a",
          800: "#4a2820",
          900: "#2d1a15",
          950: "#1a0f0c",
        },
        accent: {
          warm: "#e8a87c",
          coral: "#d4785a",
          orange: "#ff8c42",
          success: "#4ade80",
          danger: "#f87171",
        },
        glass: {
          bg: "rgba(45, 26, 21, 0.7)",
          border: "rgba(245, 230, 211, 0.08)",
          highlight: "rgba(245, 230, 211, 0.03)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "stat": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "300" }],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(245, 230, 211, 0.05)",
        "warm": "0 4px 24px rgba(232, 168, 124, 0.15)",
        "glow": "0 0 20px rgba(232, 168, 124, 0.2)",
      },
      backdropBlur: {
        "xs": "4px",
        "glass": "20px",
      },
      backgroundImage: {
        "gradient-warm": "linear-gradient(135deg, #e8a87c 0%, #ff8c42 100%)",
        "gradient-mars": "linear-gradient(180deg, #2d1a15 0%, #1a0f0c 100%)",
        "gradient-radial": "radial-gradient(ellipse at 50% 0%, rgba(232, 168, 124, 0.05) 0%, transparent 50%)",
        "grid-pattern": `
          linear-gradient(rgba(245, 230, 211, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245, 230, 211, 0.02) 1px, transparent 1px)
        `,
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-warm": "pulse-warm 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-warm": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
