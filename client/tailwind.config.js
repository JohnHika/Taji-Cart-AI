module.exports = {
  darkMode: 'class', // This enables dark mode with the 'dark' class
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-200": "#ffbf00",
        "primary-100": "#ffc929",
        "secondary-200": "#00b050",
        "secondary-100": "#0b1a78",
        primary: {
          100: '#3aaf35',
          200: '#3aae35',
        },
      },
    },
  },
  plugins: [],
}

