import {S} from '../state.js';
import {mround, num} from '../util/money.js';
import {endOfMonth, monthName, monthOf, nextMonth, rid, ymd} from '../util/dates.js';
import {hasCounts, stockValue} from '../core/stock.js';
import {snapshot} from '../core/months.js';
import {live} from '../core/pnl.js';
import {livePartners, livePayroll} from '../core/people.js';
import {liveSuppliers} from '../core/suppliers.js';
import {saveClosed, saveDebt, saveInv, saveLedger, saveSetup, saveYr, writeLocal} from '../store/local.js';
import {flash, note} from './dom.js';
import {render} from './render.js';

export function setMonth(ym){S.ui.start=ym+'-01';S.ui.end=endOfMonth(ym);S.ui.drill=null;}

/* the whole count for a day is written in one go, when the button is pressed */
export function saveCounts(d,vals,note){
  const counts={};
  Object.keys(vals).forEach(k=>{const v=vals[k];if(v!==''&&v!=null)counts[k]=num(v);});
  const any=Object.keys(counts).length>0;
  let r=S.rc.find(x=>ymd(x.d)===d);
  /* a reason with nothing counted explains nothing, so the day is simply uncounted */
  if(!any){
    if(r)S.rc=S.rc.filter(x=>x.id!==r.id);
    return {any:false,n:0,p:saveYr('rc',S.rc,[d])};}
  if(!r){r={id:rid(),d,counts:{},note:''};S.rc.push(r);}
  delete r.counted;
  r.counts=counts;r.note=note||'';
  return {any:true,n:Object.keys(counts).length,p:saveYr('rc',S.rc,[d])};}

export function closeMonth(){
  const m=monthOf(S.ui.start),r=live(),prt=livePartners(),sup=liveSuppliers(),cd=r.cogs.date;
  S.closed[m]=snapshot();saveClosed(m);
  S.ledger=S.ledger.filter(l=>!(ymd(l.d)===S.ui.end&&prt.some(p=>p.name===l.p)));
  prt.forEach(p=>S.ledger.push({id:rid(),d:S.ui.end,p:p.name,bf:p.bf,share:p.profit,wd:p.wd,paid:p.paid,cf:p.cf}));
  saveLedger();
  if(cd&&hasCounts(cd)){S.inv[cd].closing=mround(stockValue(cd));
    S.inv[cd].prices={};(S.setup.stockItems||[]).forEach(it=>{S.inv[cd].prices[it.name]=num(it.price);});
    saveInv(cd);}
  S.debt={asAt:S.ui.end,brought:{}};
  sup.forEach(s=>{S.debt.brought[s.name]=s.still;});saveDebt();
  /* An advance bigger than the month's salary is still owed; carry it so next
     month deducts it instead of paying the salary over again. */
  const pay=livePayroll();
  (S.setup.staff||[]).forEach(st=>{const q=pay.find(x=>x.name===st.name);
    st.carryIn=q?num(q.carry):0;});
  saveSetup();
  S.ui.d.confirmClose=null;
  setMonth(nextMonth(m));
  flash(monthName(m)+' is closed and frozen. Supplier debt rebased to '+S.closed[m].period.end+', and you are now in '+monthName(monthOf(S.ui.start))+'.');}

export function reopen(){const m=monthOf(S.ui.start),c=S.closed[m];if(!c)return;
  delete S.closed[m];
  writeLocal();render();
  flash(monthName(m)+' is open again. The partner ledger rows and the rebased supplier debt are still there — close it again to rewrite them.');}
