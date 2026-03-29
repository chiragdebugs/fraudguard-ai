import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      colors: {
        background: "#04070f",
        card: "rgba(15, 23, 42, 0.7)",
        accent: "#6366f1",
        success: "#22c55e",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,0.25), 0 12px 40px rgba(17,24,39,0.5)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [animate],
};

export default config;
