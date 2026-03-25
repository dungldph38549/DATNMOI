/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5", // Elegant Indigo
        secondary: "#EC4899", // Vibrant Pink for youthfulness
        "background-light": "#F8FAFC",
        "background-dark": "#0F172A",
        surface: "#ffffff",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
    },
  },
  plugins: [],
};
