import type { Config } from 'tailwindcss';
const config: Config={content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],theme:{extend:{colors:{primary:{DEFAULT:'#22d3ee'}},keyframes:{pulseGlow:{'0%,100%':{transform:'scale(0.95)',boxShadow:'0 0 0 rgba(34,211,238,0.0)'},'50%':{transform:'scale(1.05)',boxShadow:'0 0 30px rgba(34,211,238,0.35)'}}},animation:{pulseGlow:'pulseGlow 1.8s ease-in-out infinite'}}},plugins:[]};
export default config;
