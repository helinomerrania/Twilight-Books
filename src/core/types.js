import {EPAY, S, XFER} from '../state.js';
import {num} from '../util/money.js';
import {inPer} from '../util/dates.js';
import {elecDetails} from './electricity.js';

/* ============================================================ calculations */
export function sumCB(type,field,detail,all){let t=0;
  for(const e of S.cb){if(e.t!==type)continue;if(!all&&!inPer(e.d))continue;
    if(detail!=null&&e.x!==detail)continue;t+=num(e[field]);}
  return t;}

export function typeNames(){const t=(S.setup.types||[]).map(x=>x.name);
  [XFER,EPAY].forEach(n=>{if(!t.includes(n))t.push(n);});return t;}

export function typeDetails(t){
  const st=S.setup||{};
  if(t===XFER)return [];
  if(t===EPAY)return elecDetails();
  if(t==='Staff Advance'||t==='Salary Payment')return (st.staff||[]).map(s=>s.name);
  if(t==='Owner Advance'||t==='Owner Repayment'||t==='Partner Settlement'||t==='Owner Capital In')
    return (st.partners||[]).map(p=>p.name);
  if(t==='Supplier Payment'||t==='Supplier Cash Purchase')return (st.suppliers||[]).slice();
  if(t==='Fixed Expense Payment')return (st.fixedExpenses||[]).map(f=>f.name);
  const x=(st.types||[]).find(y=>y.name===t);return x?(x.details||[]):[];}
