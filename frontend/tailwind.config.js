/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06111f",
        panel: "#111",
        line: "#1f3348",
        mint: "#7cf2cc",
        sky: "#8fb7ff",
        rose: "#ff8aa1",
        amber: "#ffca70",
      },
      boxShadow: {
        panel: "0 24px 70px rgba(2, 6, 23, 0.42)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(143,183,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(143,183,255,0.06) 1px, transparent 1px)",
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
