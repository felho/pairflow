import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Avenir Next", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "Menlo", "monospace"]
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "1"
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "0.82"
          }
        },
        "attention-pulse": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.45"
          }
        }
      },
      animation: {
        "soft-pulse": "soft-pulse 1.4s ease-in-out infinite",
        "attention-pulse": "attention-pulse 1.15s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
