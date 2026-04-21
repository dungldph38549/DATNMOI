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
        convot: {
          cream: "#FDFBF7",
          sage: "#8BA88E",
          charcoal: "#1A1A1A",
        },
      },
      fontFamily: {
        display: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        body: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        times: ["Cormorant Garamond", "Georgia", "serif"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      keyframes: {
        sizePickZoom: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        sizePickZoom:
          "sizePickZoom 0.55s cubic-bezier(0.22, 1, 0.36, 1) 1 both",
      },
    },
  },
  plugins: [],
};
