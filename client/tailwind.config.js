/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        iw: {
          bg: '#080A0D',
          sf: '#0F1117',
          ev: '#161B24',
          bd: '#1E2533',
          tx: '#E8ECF0',
          sc: '#8892A4',
          mt: '#4A5468',
          am: '#F5A623',
          amd: '#7A4F0D',
          tl: '#00C9A7',
          tld: '#00332A',
          rd: '#FF4545',
          rdd: '#3D1010',
          bl: '#4A9EFF',
          bld: '#0D2340',
          pu: '#A78BFA',
          pud: '#2D1B69',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
