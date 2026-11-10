import {EPAY, S} from '../state.js';
import {money, mround, noteSize, num} from '../util/money.js';
import {endOfMonth, inPer, monthName, monthOf, ymd} from '../util/dates.js';
import {elecCalc, elecCharged, elecDetails, elecOwedFor} from './electricity.js';
import {partnerNote, partners, payroll} from './people.js';
import {suppliers} from './suppliers.js';

/* ---- which month a payment answers for
   A payment made on the Settle up page carries the month it settles. Paying
   October's rent in November then clears October, while the cash still leaves
   on the day it actually left - so the cash counts keep tying. A row with no
   month on it (typed in by hand, or written before this existed) counts by its
   date exactly as it always did. */
export function paidForMonth(type,detail){
  const m=monthOf(S.ui.start);let t=0;
  for(const e of S.cb){
    if(e.t!==type)continue;
    if(detail!=null&&e.x!==detail)continue;
    if(e.m?e.m!==m:!inPer(e.d))continue;
    t+=num(e.out);}
  return t;}

/* What a supplier is owed is a running total, so a payment that answers for an
   earlier month must still count in every month after it, not only in its own. */
export function settlesOn(e){return e.m?endOfMonth(e.m):ymd(e.d);}

export function dueSalaries(){return payroll().map(p=>{
  const note=money(p.gross)+' salary'
    +(p.adv?' \u2212 '+money(p.adv)+' advances':'')
    +(p.paid?' \u2212 '+money(p.paid)+' already paid':'')
    +(p.carryIn?' \u2212 '+money(p.carryIn)+' carried in':'')
    +(p.carry?'  \u00b7  '+money(p.carry)+' carries to next month':'');
  if(p.payNow>0)return {x:p.name,amt:mround(p.payNow),t:'Salary Payment',note};
  return {x:p.name,amt:0,note,
    done:p.paid>0?'paid':(p.adv>0?'taken in advances':(p.gross?'nothing to pay':'no salary set'))};});}

export function dueSuppliers(){const ns=noteSize();
  return suppliers().filter(x=>x.still>0||num(x.stock)>0).map(x=>{
    /* the debt is meant to equal their stock still here, so what is payable is what
       has been consumed; rounded down to a whole note so weighing noise never asks to be paid */
    const pay=Math.floor(Math.max(0,x.still-num(x.stock))/ns)*ns;
    const note=money(x.still)+' owed \u2212 '+money(x.stock)+' of their stock still here';
    if(pay>0)return {x:x.name,amt:pay,t:'Supplier Payment',editable:true,note};
    return {x:x.name,amt:0,note,done:x.paid>0?'paid':'nothing consumed to pay'};});}

export function dueFixed(){return (S.setup.fixedExpenses||[]).map(f=>{
    const paid=paidForMonth('Fixed Expense Payment',f.name),due=num(f.amount)-paid;
    const note=money(f.amount)+' charged to the month'+(paid?' \u2212 '+money(paid)+' paid':'');
    if(due>0)return {x:f.name,amt:mround(due),t:'Fixed Expense Payment',note};
    return {x:f.name,amt:0,note,done:'paid'};});}

export function dueElec(){const out=[];
  elecCalc().forEach(x=>{const billed=elecCharged(x.row.m);if(!billed)return;
    const owed=elecOwedFor(x.row.m),paid=billed-owed;
    const note=money(billed)+' billed'+(paid?' \u2212 '+money(paid)+' paid':'');
    out.push(owed>0
      ? {x:'Electricity '+monthName(x.row.m),amt:mround(owed),t:EPAY,month:x.row.m,note}
      : {x:'Electricity '+monthName(x.row.m),amt:0,note,done:'paid'});});
  return out;}

export function dueBills(){
  const el=elecDetails(),mb=(S.setup.types||[]).find(t=>t.name==='Monthly Bill');
  return ((mb&&mb.details)||[]).filter(d=>!el.includes(d)).map(d=>{
    const paidNow=paidForMonth('Monthly Bill',d);
    let last=0,lastD='';
    for(const e of S.cb)if(e.t==='Monthly Bill'&&e.x===d&&ymd(e.d)<S.ui.start&&ymd(e.d)>=lastD){
      lastD=ymd(e.d);last=num(e.out);}
    if(paidNow>0)return {x:d,amt:0,note:money(paidNow)+' paid this month',done:'paid'};
    if(!last)return null;   /* never paid before, so there is nothing to remind about */
    return {x:d,amt:last,t:'Monthly Bill',editable:true,guess:true};}).filter(Boolean);}

export function duePartners(){return partners().map(p=>{
  const note=partnerNote(p);
  if(p.bal>0)return {x:p.name,amt:mround(p.bal),t:'Partner Settlement',note};
  if(p.bal<0)return {x:p.name,amt:0,over:-p.bal,note};
  return {x:p.name,amt:0,note,done:p.paid>0?'paid':(p.wd>0?'taken in advances':'nothing to pay')};});}
