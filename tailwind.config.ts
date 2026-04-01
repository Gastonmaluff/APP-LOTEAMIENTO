import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6f7",
          100: "#d9ebee",
          200: "#b3d8dd",
          300: "#81bcc4",
          400: "#4f9ea8",
          500: "#2e808c",
          600: "#236670",
          700: "#1f525a",
          800: "#1e444a",
          900: "#1c393e"
        },
        sand: "#f4ede3",
        pine: "#20332f"
      },
      boxShadow: {
        soft: "0 24px 60px rgba(12, 31, 36, 0.12)"
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
} satisfies Config;
