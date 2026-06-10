import type { Config } from "tailwindcss";

/**
 * Kora design system — Tailwind theme.
 * Couleurs nommées d'après le brief Kora. Les tokens sémantiques requis par
 * shadcn/ui (border, input, ring, muted, accent, popover, card, destructive...)
 * sont mappés sur la palette Kora pour que les composants shadcn adoptent
 * automatiquement le thème.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // — Surfaces & fond —
        background: "#fbf9f5", // fond général (jamais blanc pur)
        foreground: "#1b1c1a", // alias on-surface pour shadcn
        surface: {
          DEFAULT: "#ffffff", // cards, panels
          low: "#f5f3f0", // zones secondaires
          container: "#efeeea", // inputs, tags
        },

        // — Primary (vert sauge) —
        primary: {
          DEFAULT: "#52634c", // CTA principal, actif sidebar
          foreground: "#ffffff", // on-primary (shadcn)
          container: "#8b9d83", // version claire
          light: "#d5e8cb", // hover très léger
        },
        "on-primary": "#ffffff",

        // — Secondary (brun chaud) —
        secondary: {
          DEFAULT: "#705a4a", // accents
          foreground: "#ffffff",
          container: "#f8dac5", // pêche pâle (badges, highlights)
        },

        // — Textes —
        "on-surface": "#1b1c1a", // texte principal
        "on-surface-variant": "#444841", // texte secondaire

        // — Bordures —
        outline: {
          DEFAULT: "#747870", // bordures normales
          variant: "#c4c8be", // bordures légères
        },

        // — Erreur —
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },

        // — Tokens sémantiques shadcn/ui (mappés sur Kora) —
        border: "#c4c8be",
        input: "#c4c8be",
        ring: "#52634c",
        muted: {
          DEFAULT: "#f5f3f0",
          foreground: "#444841",
        },
        accent: {
          DEFAULT: "#f8dac5",
          foreground: "#574333",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#1b1c1a",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1b1c1a",
        },
        destructive: {
          DEFAULT: "#ba1a1a",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        manrope: ["var(--font-manrope)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)", // 8px — boutons, inputs (shadcn)
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 30px rgba(0,0,0,0.08)",
        modal: "0 8px 40px rgba(0,0,0,0.10)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
