/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#0b0f17",
          panel: "#161c26",
          panelSoft: "#111827",
          panelEnd: "#0f1623",
          nested: "#0d1420",
          nestedSoft: "#0c131e",
          input: "#060c13",
          text: "#f8fafc",
          textSoft: "#cbd5e1",
          muted: "#8a99ad",
          meta: "#94a3b8",
          accent: "#f5b041",
          cyan: "#67e8f9",
          danger: "#fda4af"
        },
        appBorder: {
          DEFAULT: "rgba(51, 65, 85, 0.4)",
          faint: "rgba(255, 255, 255, 0.06)",
          cyan: "rgba(34, 211, 238, 0.2)",
          danger: "rgba(251, 113, 133, 0.2)"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      borderRadius: {
        app: "28px",
        appNested: "22px",
        appControl: "20px",
        appButton: "16px"
      },
      boxShadow: {
        appCard: "0 14px 34px rgba(0,0,0,0.24)",
        appAction: "0 10px 24px rgba(245,176,65,0.18)"
      },
      spacing: {
        appPageBottom: "7rem",
        appCardGap: "0.625rem",
        appCardPadding: "1rem",
        appInnerGap: "0.75rem",
        appListGap: "0.5rem"
      },
      fontSize: {
        appMeta: ["0.75rem", { lineHeight: "1.25rem" }],
        appBody: ["0.875rem", { lineHeight: "1.5rem" }]
      }
    }
  },
  plugins: []
};