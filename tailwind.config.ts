import type { Config } from "tailwindcss";

const pk = (name: string) => `var(--pk-${name})`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: pk("border"),
        "pk-surface": pk("surface"),
        "pk-card": pk("card"),
        "pk-elevated": pk("elevated"),
        "pk-elevated-hover": pk("elevated-hover"),
        "pk-content-primary": pk("content-primary"),
        "pk-content-secondary": pk("content-secondary"),
        "pk-content-tertiary": pk("content-tertiary"),
        "pk-content-quaternary": pk("content-quaternary"),
        "pk-border": pk("border"),
        "pk-border-strong": pk("border-strong"),
        "pk-blue": pk("blue"),
        "pk-blue-tint": pk("blue-tint"),
        "pk-green": pk("green"),
        "pk-green-tint": pk("green-tint"),
        "pk-red": pk("red"),
        "pk-red-tint": pk("red-tint"),
        "pk-yellow": pk("yellow")
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter Fallback",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      borderRadius: {
        sm: "0.35rem",
        md: "0.5rem",
        lg: "0.7rem",
        xl: "0.9rem"
      },
      boxShadow: {
        "pk-card-hover":
          "0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.025), 0 3px 3px -1.5px rgba(0,0,0,0.025), 0 6px 14px -3px rgba(0,0,0,0.025), 0 20px 16px -10px rgba(0,0,0,0.025), 0 5px 24px rgba(0,0,0,0.04)"
      },
      maxWidth: {
        page: "1350px"
      }
    }
  },
  plugins: []
};

export default config;
