import {S} from '../state.js';

/* The lounge closes after midnight, so the day must be the local one.
   toISOString() is Greenwich, which is three hours behind and lands the
   night's takings on yesterday - and on the 1st, in last month. */
export function localDay(d){d=d||new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

export function today(){return localDay();}

export function ymd(d){return String(d||'').slice(0,10);}

export function monthOf(d){return String(d||'').slice(0,7);}

export function endOfMonth(ym){const[y,m]=String(ym).split('-').map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);}

export function monthName(ym){const[y,m]=String(ym).split('-');
  return new Date(Date.UTC(+y,+m-1,1)).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});}

export function monthShort(ym){const[y,m]=String(ym).split('-');
  return new Date(Date.UTC(+y,+m-1,1)).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'});}

export function nextMonth(ym){const[y,m]=String(ym).split('-').map(Number);
  return new Date(Date.UTC(y,m,1)).toISOString().slice(0,7);}

export function shiftMonth(ym,n){const[y,m]=String(ym).split('-').map(Number);
  return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7);}

export function daysBetween(a,b){return Math.round((Date.parse(b)-Date.parse(a))/86400000);}

export const inPer=d=>{const x=ymd(d);return x>=S.ui.start&&x<=S.ui.end;};

export function byDate(a){return a.slice().sort((x,y)=>ymd(x.d)<ymd(y.d)?-1:ymd(x.d)>ymd(y.d)?1:0);}

export function rid(){return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
