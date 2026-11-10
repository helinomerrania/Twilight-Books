import {S} from '../state.js';

export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const num=v=>{const n=typeof v==='number'?v:parseFloat(String(v==null?'':v).replace(/,/g,''));return isFinite(n)?n:0;};

export function money(n){const v=Math.round(num(n));return (v<0?'-':'')+Math.abs(v).toLocaleString('en-US');}

export function cls(n){return num(n)<0?'neg':'';}

export function noteSize(){return num(S.setup&&S.setup.business&&S.setup.business.rounding)||250;}

/* away from zero on a half, so -375 and 375 move the same distance */
export function mround(x){const m=noteSize()||1,q=x/m;
  return (q<0?-Math.round(-q):Math.round(q))*m;}

export function qty(v){return (Math.round(num(v)*1000)/1000).toLocaleString('en-US',{maximumFractionDigits:3});}

export function pct(x){return (num(x)*100).toFixed(1)+'%';}
