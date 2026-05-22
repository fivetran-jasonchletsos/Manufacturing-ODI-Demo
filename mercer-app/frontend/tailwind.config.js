/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: '#f8f8f8',
          100: '#e5e5e5',
          200: '#c4c4c4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#1f2937',
          900: '#111827',
        },
        safety: {
          DEFAULT: '#ffd60a',
          dim: '#caa600',
          bright: '#ffe45a',
        },
        bone: '#f5f5f0',
        alert: '#dc2626',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'Bebas Neue', 'Impact', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
};
