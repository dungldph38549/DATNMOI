/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f49d25",
        "background-light": "#f8f7f5",
        "background-dark": "#221a10",
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
      },
      borderRadius: {
        lg: "2rem",
        xl: "3rem",
      },
    },
  },
  plugins: [],
};
