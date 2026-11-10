import {S, XFER} from '../state.js';
import {num} from '../util/money.js';
import {byDate, inPer} from '../util/dates.js';

/* ---- where the money went: every kind, every name, openable.
   Moving money between pots is left out: nothing arrives or leaves, it only shifts. */
export function cashFlow(){
  const out={},inn={};
  for(const e of S.cb){
    if(!inPer(e.d)||e.t===XFER)continue;
    const nm=e.x||'(not named)';
    const put=(m,amt)=>{const g=m[e.t]||(m[e.t]={t:e.t,total:0,by:{}});
      g.total+=amt;g.by[nm]=(g.by[nm]||0)+amt;};
    if(num(e.out)>0)put(out,num(e.out));
    if(num(e.in)>0)put(inn,num(e.in));
  }
  const shape=m=>Object.keys(m).map(k=>({t:m[k].t,total:m[k].total,
      rows:Object.keys(m[k].by).map(n=>[n,m[k].by[n]]).sort((a,b)=>b[1]-a[1])}))
      .sort((a,b)=>b.total-a.total);
  return {out:shape(out),inn:shape(inn)};}

/* everything this name did this month, whatever kind it was filed under */
export function drillRows(name){return byDate(S.cb.filter(e=>inPer(e.d)&&(e.x||'(not named)')===name));}

/* A bar is the row's share of its own kind, so the lengths mean the same thing
   everywhere: within a kind they compare, and the figure beside carries the money. */
export function share(v,total){return total>0?Math.max(2,(v/total)*100).toFixed(1):0;}
