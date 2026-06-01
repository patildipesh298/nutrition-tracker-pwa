export const today = () => new Date().toISOString().slice(0,10);
export const id = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
export function readLS<T>(key:string, fallback:T):T { if(typeof window==='undefined') return fallback; try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw) as T:fallback; } catch { return fallback; } }
export function writeLS<T>(key:string, value:T){ if(typeof window!=='undefined') localStorage.setItem(key, JSON.stringify(value)); }
export const round = (n:number=0,d=0)=>Number(n||0).toFixed(d).replace(/\.0$/,'');
export function toast(message:string){ if(typeof window==='undefined') return; window.dispatchEvent(new CustomEvent('app-toast',{detail:{message}})); }
