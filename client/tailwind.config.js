/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all relevant file types
  ],
  theme: {
    fontFamily: {
      display: ["Poppins", "Arial", "sans-serif"], // Fallbacks for better compatibility
    },
    extend: {
      colors: {
        primary: "#058603", // Primary green
        secondary: "#EF863E", // Secondary orange
      },
    },
  },
  plugins: [],
};
