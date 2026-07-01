import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0A0E14",
        panel: "#111823",
        line: "#1E2A38",
        signal: "#4ECDC4",
        alert: "#FF3B3B",
        amber: "#FF8C42",
        fog: "#8CA0B3",
        paper: "#EAF1F5",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        alertFlash: {
          "0%, 100%": { backgroundColor: "rgba(255,59,59,0)" },
          "50%": { backgroundColor: "rgba(255,59,59,0.42)" },
        },
        alertBorder: {
          "0%, 100%": {
            borderColor: "rgba(255,59,59,0.75)",
            boxShadow: "inset 0 0 72px rgba(255,59,59,0.25)",
          },
          "50%": {
            borderColor: "rgba(255,255,255,0.95)",
            boxShadow: "inset 0 0 96px rgba(255,59,59,0.5)",
          },
        },
      },
      animation: {
        sweep: "sweep 4s linear infinite",
        pulseRing: "pulseRing 1.4s cubic-bezier(0.2,0.6,0.4,1) infinite",
        alertFlash: "alertFlash 0.65s ease-in-out infinite",
        alertBorder: "alertBorder 0.65s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
