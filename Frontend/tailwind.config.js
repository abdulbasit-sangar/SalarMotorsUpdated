/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        /* Blue identity (gold -> blue, 2026-11-05). The `graphite` /
           `steel` / `ash` / `bone` names are legacy aliases kept stable so
           the ~290 existing class references update by value, not by
           rename: graphite is now cool slate/blue-gray, bone is dark navy.
           Canonical new scale is `brand` below. */
        graphite: {
          DEFAULT: "#0F172A",
          50: "#F8FAFC",
          100: "#EFF6FF",
          800: "#DBEAFE",
          900: "#EFF6FF",
          950: "#FFFFFF",
        },
        steel: "#E2E8F0",
        ash: "#475569",
        bone: "#0F172A",
        /* `brass` is a legacy alias for brand blue — kept so existing
           bg-brass / text-brass / ring-brass / border-brass classes keep
           working. New code should use `brand` instead. Values are the
           user palette exactly: #2563EB / #60A5FA / #1D4ED8. */
        brass: {
          DEFAULT: "#2563EB",
          light: "#60A5FA",
          dark: "#1D4ED8",
        },
        /* Canonical brand-blue scale (user palette, 2026-11-05). */
        brand: {
          DEFAULT: "#2563EB",
          light: "#60A5FA",
          dark: "#1D4ED8",
          soft: "#DBEAFE",
          pale: "#EFF6FF",
          sky: "#38BDF8",
          navy: "#0F172A",
        },
        /* Semantic success: the mandated #16A34A family (was teal
           #2F8F7A — same role, on-palette green now). */
        signal: {
          DEFAULT: "#16A34A",
          light: "#4ADE80",
          dark: "#15803D",
        },
        danger: "#DC2626",
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
        // All three resolve to --font-sans (see index.css): Inter for
        // English, an Arabic-script font for Pashto/Dari (Inter has no
        // glyphs for them).
        display: ["var(--font-sans)"],
        body: ["var(--font-sans)"],
        mono: ["var(--font-sans)"],
      },
      borderRadius: {
        tag: "2px",
        premium: "0.875rem",
        "premium-lg": "1rem",
      },
      boxShadow: {
        tag: "0 1px 0 0 rgba(242,239,233,0.06) inset",
        lift: "0 12px 32px -12px rgba(15,23,42,0.28)",
        card: "0 1px 3px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)",
        "card-hover":
          "0 12px 32px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.05)",
        premium: "0 4px 24px rgba(15,23,42,0.10)",
        glass: "0 12px 40px -12px rgba(15,23,42,0.18)",
      },
      backdropBlur: {
        glass: "20px",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.035) 1px, transparent 0)",
      },
      backgroundSize: {
        grain: "4px 4px",
      },
    },
  },
  plugins: [],
};
