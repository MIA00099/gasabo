/**
 * Ported verbatim from the delivered mockups (nmm/*.html), where this config
 * was inlined for the Tailwind CDN build. The CDN script is development-only,
 * so the same theme lives here and compiles through Vite instead.
 *
 * These values are the design authority. Anything that disagrees with them
 * elsewhere in the app is wrong, not the other way round.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#04562D',  // top bar, buttons, logos, prices
          dark: '#0B1C3A',   // navy - category nav bar, headings
          orange: '#F5A623', // badges, Post an Ad
          light: '#F4F7F6',  // page background
          text: '#333333',
          gray: '#6B7280',
          border: '#E5E7EB',
        },
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        card: '0 2px 10px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
};
