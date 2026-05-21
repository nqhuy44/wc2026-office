import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: { 
        sans: ['Inter', 'sans-serif'] 
      },
      colors: {
        background: '#fafafa',
        surface: '#ffffff',
        primary: { DEFAULT: '#09090b', hover: '#27272a', foreground: '#fafafa' },
        accent: { DEFAULT: '#3b82f6', foreground: '#ffffff' },
        muted: { DEFAULT: '#71717a', foreground: '#a1a1aa' },
        success: '#10b981',
        warning: '#f59e0b',
        border: '#e4e4e7',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'float': '0 10px 40px -10px rgba(0,0,0,0.08)',
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.04em',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
