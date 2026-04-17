import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          card: '#13131a',
          terminal: '#080810',
        },
        border: {
          DEFAULT: '#1e1e2e',
          hover: '#9945FF',
        },
        solana: {
          purple: '#9945FF',
          green: '#14F195',
        },
        status: {
          error: '#FF4444',
          warning: '#FFB800',
          success: '#14F195',
        },
        text: {
          primary: '#FFFFFF',
          muted: '#6B7280',
          dim: '#4B5563',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-dot': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'count-up': 'countUp 1s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern':
          'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(153,69,255,0.03) 40px, rgba(153,69,255,0.03) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(153,69,255,0.03) 40px, rgba(153,69,255,0.03) 41px)',
      },
    },
  },
  plugins: [],
};

export default config;
