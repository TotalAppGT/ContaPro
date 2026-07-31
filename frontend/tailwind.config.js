/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#d9e5ff',
          200: '#bcd0ff',
          300: '#8eb2ff',
          400: '#598bff',
          500: '#3366ff',
          600: '#1a44f5',
          700: '#1333e1',
          800: '#162db6',
          900: '#182a8f',
          950: '#0A2472',
        },
        accent: {
          50: '#fffef0',
          100: '#fffbc4',
          200: '#fff587',
          300: '#ffea4a',
          400: '#ffdb1a',
          500: '#F0B90B',
          600: '#cc9900',
          700: '#a67c00',
          800: '#8a6600',
          900: '#705200',
        },
        sidebar: {
          DEFAULT: '#0A1628',
          hover: '#152238',
          active: '#1a3a6e',
        },
        success: '#16a34a',
        warning: '#ca8a04',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
