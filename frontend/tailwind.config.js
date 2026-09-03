/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jira: {
          blue: '#0052CC',
          'blue-dark': '#0747A6',
          'blue-light': '#DEEBFF',
          gray: '#F4F5F7',
          'gray-dark': '#172B4D',
          'gray-medium': '#6B778C',
          green: '#00875A',
          yellow: '#FF991F',
          red: '#DE350B',
          purple: '#6554C0',
        },
      },
    },
  },
  plugins: [],
};
