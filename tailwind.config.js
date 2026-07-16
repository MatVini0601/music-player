/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#121212',
          raised: '#1c1c1e',
          hover: '#262628'
        },
        accent: {
          // Driven by a CSS variable so the user can re-theme at runtime (Settings → accent color).
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)'
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 180ms ease-out',
        'pop-in': 'popIn 120ms ease-out'
      }
    }
  },
  plugins: []
}
