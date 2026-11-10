import {S} from '../state.js';
import {num} from '../util/money.js';
import {ymd} from '../util/dates.js';
import {potOf} from './pots.js';
import {countForPeriod, countsFor, hasCounts, itemValue} from './stock.js';
import {frozen} from './months.js';
import {settlesOn} from './settle.js';

export function liveSuppliers(){const asAt=S.debt.asAt||'';const cd=countForPeriod();
  const counts=cd&&hasCounts(cd)?countsFor(cd):{};
  return (S.setup.suppliers||[]).map(name=>{
    const bf=num((S.debt.brought||{})[name]);
    /* bounded by the month being looked at, or a receipt dated next year would
       show up in this month's debt and in the figure the settle-up offers to pay */
    let credit=0;for(const p of S.pu)
      if(p.s===name&&p.terms!=='Cash'&&ymd(p.d)>asAt&&ymd(p.d)<=S.ui.end)credit+=num(p.amt);
    let paid=0;for(const e of S.cb){
      if(e.t!=='Supplier Payment'||e.x!==name)continue;
      const on=settlesOn(e);
      if(on>asAt&&on<=S.ui.end)paid+=num(e.out);}
    let stock=0;for(const it of S.setup.stockItems||[])if(it.supplier===name)stock+=itemValue(it,counts,cd);
    return {name,owedBefore:bf+credit,paid,still:bf+credit-paid,stock};});}

export function suppliers(){const f=frozen();return f?f.suppliers:liveSuppliers();}

/* ---- a supplier's account for the month: what was carried in, what came,
   what was paid, what is left. Only credit receipts make debt; cash ones never did. */
export function supStatement(name){
  const asAt=S.debt.asAt||'';
  let opening=num((S.debt.brought||{})[name]);
  const lines=[];let bought=0,paid=0;
  for(const p of S.pu){
    if(p.s!==name||p.terms==='Cash')continue;
    const d=ymd(p.d);if(d<=asAt)continue;
    if(d<S.ui.start)opening+=num(p.amt);
    else if(d<=S.ui.end){bought+=num(p.amt);
      lines.push({d,what:'Receipt'+(p.no?' '+p.no:'')+(p.w&&p.w!=='Several items'?' \u00b7 '+p.w:''),amt:num(p.amt)});}
  }
  for(const e of S.cb){
    if(e.t!=='Supplier Payment'||e.x!==name)continue;
    const d=ymd(e.d);if(d<=asAt)continue;
    if(d<S.ui.start)opening-=num(e.out);
    else if(d<=S.ui.end){paid+=num(e.out);
      lines.push({d,what:'Paid \u00b7 '+potOf(e),amt:-num(e.out)});}
  }
  lines.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  let stock=0;const cd=countForPeriod(),counts=cd&&hasCounts(cd)?countsFor(cd):{};
  for(const it of S.setup.stockItems||[])if(it.supplier===name)stock+=itemValue(it,counts,cd);
  return {name,opening,lines,bought,paid,closing:opening+bought-paid,stock:stock};}

export function supAll(){return (S.setup.suppliers||[]).map(supStatement)
  .filter(x=>x.opening||x.lines.length||x.closing||x.stock);}
