/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: {
          50: 'rgba(255,255,255,0.06)',
          100: 'rgba(255,255,255,0.10)',
          200: 'rgba(255,255,255,0.16)',
          300: 'rgba(255,255,255,0.24)',
        },
        accent: {
          DEFAULT: '#7C5CFF',
          light: '#A78BFF',
          glow: '#22D3EE',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
        glow: '0 0 40px rgba(124,92,255,0.45)',
      },
      backdropBlur: {
        xs: '4px',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(20px, -30px) scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        floatSlow: 'floatSlow 18s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};
