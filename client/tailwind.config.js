module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — Nawiri Hair
        plum: {
          900: '#2D0B24',
          800: '#3A1030',
          700: '#4B1E3E',
          600: '#5F2B50',
          500: '#7B3D6E',
          400: '#9C5A8E',
          300: '#BD7EAF',
          200: '#D9A8CB',
          100: '#F0D6E8',
          50:  '#FAF0F6',
        },
        gold: {
          600: '#A87020',
          500: '#C9943A',
          400: '#D9AD58',
          300: '#E8C478',
          200: '#F2D89A',
          100: '#FDF5E4',
          50:  '#FFFDF7',
        },
        blush: {
          500: '#D4758A',
          400: '#E8A0B0',
          300: '#F0BCC8',
          200: '#F5D5DC',
          100: '#FBF0F3',
          50:  '#FFF7F9',
        },
        ivory: '#FAF8F5',
        charcoal: '#1A0F14',
        'brown-600': '#6B3D30',
        'brown-500': '#7D4E40',
        'brown-400': '#8B5E52',
        'brown-300': '#A87A6C',
        'brown-200': '#C9A89E',
        'brown-100': '#F0E8E5',
        'brown-50':  '#FAF5F3',
        // Dark mode surfaces
        'dm-surface': '#0E080C',
        'dm-card':    '#1C1018',
        'dm-card-2':  '#251520',
        'dm-border':  '#3A2030',
        'dm-muted':   '#6B4A5A',
        // Semantic
        'brand':  '#4B1E3E',
        'accent': '#C9943A',
        // Keep legacy keys so nothing breaks before component updates
        "primary-200": "#C9943A",
        "primary-100": "#E8C478",
        "secondary-200": "#7B3D6E",
        "secondary-100": "#4B1E3E",
        primary: {
          50:  '#FAF0F6',
          100: '#F0D6E8',
          200: '#D9A8CB',
          300: '#BD7EAF',
          400: '#9C5A8E',
          500: '#7B3D6E',
          600: '#5F2B50',
          700: '#4B1E3E',
          800: '#3A1030',
          900: '#2D0B24',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        price:   ['"Montserrat"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '3xl': ['2rem',    { lineHeight: '1.2' }],
        '4xl': ['2.5rem',  { lineHeight: '1.15' }],
        '5xl': ['3.5rem',  { lineHeight: '1.1' }],
        '6xl': ['4.5rem',  { lineHeight: '1.05' }],
      },
      borderRadius: {
        'card': '1rem',
        'pill': '9999px',
        'lg':   '0.75rem',
      },
      boxShadow: {
        'card':  '0 2px 16px rgba(75,30,62,0.07)',
        'hover': '0 8px 32px rgba(75,30,62,0.14)',
        'gold':  '0 0 0 3px rgba(201,148,58,0.35)',
        'plum':  '0 0 0 3px rgba(75,30,62,0.25)',
        'sm':    '0 1px 6px rgba(75,30,62,0.06)',
      },
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        'safe-top':    'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left':   'env(safe-area-inset-left)',
        'safe-right':  'env(safe-area-inset-right)',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up':        'fadeUp 0.5s ease both',
        'fade-up-slow':   'fadeUp 0.7s ease both',
        'fade-in':        'fadeIn 0.4s ease both',
        'slide-in-left':  'slideInLeft 0.4s ease both',
        'slide-in-right': 'slideInRight 0.4s ease both',
        'shimmer':        'shimmer 1.6s linear infinite',
        'float':          'float 3s ease-in-out infinite',
        'scale-in':       'scaleIn 0.3s ease both',
      },
    },
  },
  plugins: [
    function({ addUtilities, addBase, theme }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width':    'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.hover-lift': {
          'transition': 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': {
            'transform':  'translateY(-4px)',
            'box-shadow': '0 8px 32px rgba(75,30,62,0.14)',
          },
        },
        '.press': {
          'transition': 'transform 0.1s ease',
          '&:active': {
            'transform': 'scale(0.96)',
          },
        },
        '.glass': {
          'backdrop-filter':         'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'background-color':        'rgba(250,248,245,0.85)',
          'border':                  '1px solid rgba(240,232,229,0.6)',
        },
        '.glass-dark': {
          'backdrop-filter':         'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'background-color':        'rgba(28,16,24,0.85)',
          'border':                  '1px solid rgba(58,32,48,0.6)',
        },
        '.text-gradient': {
          'background':              'linear-gradient(135deg, #C9943A, #4B1E3E)',
          '-webkit-background-clip': 'text',
          'background-clip':         'text',
          '-webkit-text-fill-color': 'transparent',
          'color':                   'transparent',
        },
        '.bg-shimmer': {
          'background':           'linear-gradient(90deg, #F0E8E5 25%, #FAF8F5 50%, #F0E8E5 75%)',
          'background-size':      '200% 100%',
          'animation':            'shimmer 1.6s linear infinite',
        },
        '.line-clamp-2': {
          'display':              '-webkit-box',
          '-webkit-line-clamp':   '2',
          '-webkit-box-orient':   'vertical',
          'overflow':             'hidden',
        },
        '.line-clamp-3': {
          'display':              '-webkit-box',
          '-webkit-line-clamp':   '3',
          '-webkit-box-orient':   'vertical',
          'overflow':             'hidden',
        },
        '.container-mobile': {
          'margin':  '0 auto',
          'padding': '0 0.5rem',
          '@media (min-width: 640px)':  { 'padding': '0 1rem' },
          '@media (min-width: 1024px)': { 'padding': '0 1.5rem' },
          '@media (min-width: 1280px)': { 'padding': '0 2rem' },
        },
        '.safe-area-top':    { 'padding-top':    'env(safe-area-inset-top)' },
        '.safe-area-bottom': { 'padding-bottom': 'env(safe-area-inset-bottom)' },
        '.safe-area-left':   { 'padding-left':   'env(safe-area-inset-left)' },
        '.safe-area-right':  { 'padding-right':  'env(safe-area-inset-right)' },
      })
    }
  ],
}
