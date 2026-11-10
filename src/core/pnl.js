import {S} from '../state.js';
import {num} from '../util/money.js';
import {inPer} from '../util/dates.js';
import {sumCB} from './types.js';
import {cogs} from './stock.js';
import {elecDetails, elecInPeriod} from './electricity.js';
import {frozen} from './months.js';

/* ---- the month's result */
export function live(){
  const sales=sumCB('Daily Sales','in'),other=sumCB('Other Income','in'),rev=sales+other;
  const c=cogs(),gross=rev-c.value;
  /* The meter reading already charges electricity to the month it was used, so a
     bill typed into the Cashbook as a Monthly Bill must not charge it a second time. */
  const el=elecDetails();
  let bills=0;for(const e of S.cb)
    if(e.t==='Monthly Bill'&&inPer(e.d)&&!el.includes(e.x))bills+=num(e.out);
  const daily=sumCB('Daily Expense','out')+bills;
  const elec=elecInPeriod();
  const fixed=(S.setup.fixedExpenses||[]).reduce((a,f)=>a+num(f.amount),0);
  const salaries=(S.setup.staff||[]).reduce((a,s)=>a+num(s.salary),0);
  const opex=daily+elec+fixed+salaries,net=gross-opex;
  return {sales,other,rev,cogs:c,gross,grossPct:rev?gross/rev:0,
          daily,elec,fixed,salaries,opex,net,netPct:rev?net/rev:0};}

export function liveExpenses(){const m={};
  for(const e of S.cb){if((e.t!=='Daily Expense'&&e.t!=='Monthly Bill')||!inPer(e.d))continue;
    m[e.x]=(m[e.x]||0)+num(e.out);}
  const el=elecInPeriod();if(el)m['Electricity (used)']=(m['Electricity (used)']||0)+el;
  return Object.entries(m).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);}

export function result(){const f=frozen();return f?f.result:live();}
