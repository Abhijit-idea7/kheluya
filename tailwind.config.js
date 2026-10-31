/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10233F',
        navy: '#0F2F5C',
        orange: '#F39200',
        'orange-soft': '#FFE2B0',
        green: '#2E8A3E',
        cream: '#F6F1E4',
        paper: '#FFFDF6',
        line: '#D9D0BB',
      },
      fontFamily: {
        body: ['Mukta', 'sans-serif'],
        heading: ['"Baloo 2"', 'cursive'],
      },
      fontSize: {
        'body-base': '1.25rem',
        'heading-lg': '2.5rem',
        'heading-md': '2rem',
        'heading-sm': '1.75rem',
      },
      spacing: {
        'touch': '3.5rem',
      },
      maxWidth: {
        content: '720px',
      },
      lineHeight: {
        body: '1.6',
      },
    },
  },
  plugins: [],
};
