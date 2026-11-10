import {S} from '../state.js';
import {noteSize, num} from '../util/money.js';
import {monthOf} from '../util/dates.js';
import {cashOnHand, inHands, potBalance, pots} from './pots.js';
import {elecInPeriod, elecOwed} from './electricity.js';
import {live, liveExpenses} from './pnl.js';
import {livePartners, livePayroll} from './people.js';
import {liveSuppliers} from './suppliers.js';

/* ---- closed months: read the record instead of recomputing it */
export function closedMonths(){return Object.keys(S.closed).sort();}

export function frozen(){const m=monthOf(S.ui.start),c=S.closed[m];
  if(c&&c.period&&c.period.start===S.ui.start&&c.period.end===S.ui.end)return c;
  return null;}

export function lastClosed(){const m=closedMonths().filter(x=>x<monthOf(S.ui.start));
  return m.length?S.closed[m[m.length-1]]:null;}

export function snapshot(){
  const m=monthOf(S.ui.start),r=live(),cd=r.cogs.date;
  const prices={};for(const it of S.setup.stockItems||[])prices[it.name]=num(it.price);
  return {month:m,period:{start:S.ui.start,end:S.ui.end},closedAt:new Date().toISOString(),
    result:r,payroll:livePayroll(),partners:livePartners(),suppliers:liveSuppliers(),expenses:liveExpenses(),
    roster:(S.setup.staff||[]).map(s=>({name:s.name,salary:num(s.salary),carryIn:num(s.carryIn)})),
    shares:(S.setup.partners||[]).map(p=>({name:p.name,share:num(p.share)})),
    fixedExpenses:(S.setup.fixedExpenses||[]).map(f=>({name:f.name,amount:num(f.amount)})),
    prices,countDate:cd,stockClosing:r.cogs.closing,
    electricity:{charged:elecInPeriod(),owedAtClose:elecOwed()},
    pots:pots().map(p=>({name:p.name,kind:p.kind||'own',balance:potBalance(p.name,S.ui.end)})),
    cashOnHand:cashOnHand(S.ui.end),inHands:inHands(S.ui.end),noteSize:noteSize()};}
