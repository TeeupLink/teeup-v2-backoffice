import type { Config } from 'tailwindcss';

// 값의 근거: docs/03.구현문서/디자인스타일가이드.md 3장·9장
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { tablet: '1024px', desktop: '1280px' },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4caf50',
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#4caf50',
          600: '#43a047',
          700: '#388e3c',
          800: '#2e7d32',
          900: '#1b5e20',
        },
        secondary: {
          DEFAULT: '#ffc107',
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        surface: {
          base: '#121212',
          card: '#1e1e1e',
          muted: '#262626',
          border: '#2e2e2e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
