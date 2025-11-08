/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 💡 [เพิ่มแค่ตรงนี้]
      // เปิดใช้งาน backdrop-blur
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
      },
      // 💡 [จบส่วนที่เพิ่ม]
    },
  },
  plugins: [],
};
