import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        daom: {
          blue: {
            DEFAULT: "#003B8E",
            dark: "#002B68",
            soft: "#EAF2FF",
          },
          red: {
            DEFAULT: "#FF1E25",
            dark: "#C8101E",
            soft: "#FFF0F1",
          },
          neutral: {
            50: "#F8FAFC",
            100: "#F1F5F9",
            200: "#E5E7EB",
            300: "#CBD5E1",
            400: "#94A3B8",
            500: "#64748B",
            600: "#4B5563",
            700: "#334155",
            800: "#1E293B",
            900: "#111827",
            950: "#0B1220",
          },
          status: {
            success: {
              DEFAULT: "#16794A",
              bg: "#EAF7F0",
            },
            warning: {
              DEFAULT: "#8A5A00",
              bg: "#FFF7DF",
            },
            danger: {
              DEFAULT: "#B42318",
              bg: "#FFF1F0",
            },
            info: {
              DEFAULT: "#175CD3",
              bg: "#EFF6FF",
            },
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "Arial", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)",
        modal: "0 18px 48px rgba(15, 23, 42, 0.14)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};
export default config;
