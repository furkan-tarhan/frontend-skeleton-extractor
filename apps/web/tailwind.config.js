/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0b0b0b',
        surface: '#141414',
        'surface-raised': '#1c1c1c',
        subtle: 'rgba(255,255,255,0.14)',
        primary: '#ffffff',
        muted: 'rgba(255,255,255,0.58)',
        ink: '#0b0b0b',
        accent: '#ffffff',
        'accent-hover': '#e5e5e5',
        'accent-soft': 'rgba(255,255,255,0.12)',
        success: '#22c55e',
        danger: '#ff4d4d',
        rarity: {
          consumer: '#b0c3d9',
          industrial: '#5e98d9',
          milspec: '#4b69ff',
          restricted: '#8847ff',
          classified: '#d32ce6',
          covert: '#eb4b4b',
          gold: '#e4ae39',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        md: ['18px', { lineHeight: '26px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['24px', { lineHeight: '32px' }],
        '2xl': ['30px', { lineHeight: '38px' }],
        '3xl': ['36px', { lineHeight: '44px' }],
        '4xl': ['44px', { lineHeight: '52px' }],
        '5xl': ['56px', { lineHeight: '64px' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(255,255,255,0.22)',
        'glow-lg': '0 0 45px rgba(255,255,255,0.35), 0 0 90px rgba(255,255,255,0.12)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(255,255,255,0.2)' },
          '50%': { boxShadow: '0 0 32px rgba(255,255,255,0.55)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
