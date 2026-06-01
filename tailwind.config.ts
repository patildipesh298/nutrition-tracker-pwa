import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'], theme: { extend: { colors: { brand: {50:'#fff4e8',100:'#ffe4cc',500:'#111318',600:'#111318',700:'#111318'}, mint:{50:'#fff7ed',500:'#d99a3f'}, amberx:{50:'#fff7ed',500:'#d99a3f'} }, boxShadow:{soft:'0 18px 50px rgba(39,32,24,.10)'} } }, plugins: [] };
export default config;
