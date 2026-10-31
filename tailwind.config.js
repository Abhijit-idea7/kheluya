/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10233F',
        navy: '#0F2F5C',
        orange: '#F39200',
        'orange-deep': '#D97B00',
        'orange-soft': '#FFE2B0',
        green: '#2E8A3E',
        'green-soft': '#DDF0DA',
        cream: '#F6F1E4',
        paper: '#FFFAF0',
        line: '#D9D0BB',
        wood: '#EDCB8E',
        'wood-edge': '#B98642',
      },
      fontFamily: {
        body: ['Mukta', 'sans-serif'],
        heading: ['"Baloo 2"', 'Mukta', 'sans-serif'],
      },
      fontSize: {
        'body-base': '1.25rem',
        'heading-xl': ['3.25rem', { lineHeight: '1.1' }],
        'heading-lg': ['2.5rem', { lineHeight: '1.15' }],
        'heading-md': ['2rem', { lineHeight: '1.2' }],
        'heading-sm': ['1.5rem', { lineHeight: '1.25' }],
      },
      spacing: {
        touch: '3.5rem',
      },
      maxWidth: {
        content: '720px',
        site: '1160px',
      },
      lineHeight: {
        body: '1.6',
      },
      boxShadow: {
        sticker: '0 5px 0 0 #10233F',
        'sticker-lg': '6px 7px 0 0 #10233F',
      },
    },
  },
  plugins: [],
};
