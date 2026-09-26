/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "#14161B",
          50: "#FDFCFA",
          100: "#F1EEE7",
          800: "#EDE8DD",
          900: "#F4F1EA",
          950: "#FAF9F6",
        },
        steel: "#E3DED2",
        ash: "#5B6472",
        bone: "#14161B",
        brass: {
          DEFAULT: "#B8863A",
          light: "#D9AD68",
          dark: "#8C6423",
        },
        signal: {
          DEFAULT: "#2F8F7A",
          light: "#57B39E",
          dark: "#1F6656",
        },
        danger: "#C1493D",
        glass: {
          DEFAULT: "rgba(255,255,255,0.62)",
          strong: "rgba(255,255,255,0.8)",
          border: "rgba(255,255,255,0.75)",
        },
      },
      fontFamily: {
        // Single primary font throughout the app (spec requirement #7) —
        // display/body/mono all resolve to Inter now instead of three
        // separate Google Fonts (Bricolage Grotesque / Inter / IBM Plex
        // Mono previously). Kept as three token names rather than
        // collapsing them to one so existing `font-display`/`font-mono`
        // classes across the app don't all need renaming — they just all
        // render as Inter now.
        display: ["'Inter'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        tag: "2px",
        premium: "1rem",
        "premium-lg": "1.25rem",
      },
      boxShadow: {
        tag: "0 1px 0 0 rgba(242,239,233,0.06) inset",
        lift: "0 12px 32px -12px rgba(20,22,27,0.28)",
        card: "0 1px 3px rgba(20,22,27,0.05), 0 4px 16px rgba(20,22,27,0.06)",
        "card-hover": "0 12px 32px rgba(20,22,27,0.10), 0 2px 8px rgba(20,22,27,0.05)",
        premium: "0 4px 24px rgba(20,22,27,0.10)",
        glass: "0 12px 40px -12px rgba(20,22,27,0.18)",
      },
      backdropBlur: {
        glass: "20px",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(20,22,27,0.035) 1px, transparent 0)",
      },
      backgroundSize: {
        grain: "4px 4px",
      },
    },
  },
  plugins: [],
};
