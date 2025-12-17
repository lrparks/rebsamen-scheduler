/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#166534',
          light: '#22c55e',
        },
        danger: '#DC2626',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
}
