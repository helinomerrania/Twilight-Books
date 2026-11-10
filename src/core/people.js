import {S} from '../state.js';
import {money, mround, num} from '../util/money.js';
import {byDate, ymd} from '../util/dates.js';
import {sumCB} from './types.js';
import {frozen} from './months.js';
import {live} from './pnl.js';
import {paidForMonth} from './settle.js';

export function livePayroll(){return (S.setup.staff||[]).map(s=>{
  /* an advance handed back is recorded on the cash-in side, so it nets off */
  const adv=sumCB('Staff Advance','out',s.name)-sumCB('Staff Advance','in',s.name),
        paid=paidForMonth('Salary Payment',s.name);
  const netPay=num(s.salary)-adv,still=netPay-paid,carryIn=num(s.carryIn);
  return {name:s.name,gross:num(s.salary),adv,netPay,paid,still,carryIn,
          payNow:Math.max(0,still-carryIn),carry:Math.max(0,carryIn-still)};});}

export function livePartners(){const net=live().net,list=S.setup.partners||[];let given=0;
  /* The last partner mops up the few dinars rounding leaves behind - but only
     when the shares really do add to 100%. Otherwise a 20% hole would land on
     him silently, so each partner simply gets his own share and a check complains. */
  const whole=Math.abs(list.reduce((a,p)=>a+num(p.share),0)-1)<1e-9;
  return list.map((p,i)=>{
    const prior=byDate(S.ledger.filter(l=>l.p===p.name&&ymd(l.d)<S.ui.start));
    const bf=prior.length?num(prior[prior.length-1].cf):0;
    /* the last partner takes whatever the rounding left over, so the shares
       always add up to the net profit exactly */
    const share=(whole&&i===list.length-1)?(net-given):mround(net*num(p.share));
    given+=share;
    const wd=sumCB('Owner Advance','out',p.name)-sumCB('Owner Repayment','in',p.name)-sumCB('Owner Capital In','in',p.name);
    const bal=bf+share-wd,paid=paidForMonth('Partner Settlement',p.name);
    return {name:p.name,share:num(p.share),bf,profit:share,wd,bal,paid,cf:bal-paid};});}

export function payroll(){const f=frozen();return f?f.payroll:livePayroll();}

export function partners(){const f=frozen();return f?f.partners:livePartners();}

export function partnerNote(p){
  return money(p.profit)+' share'
    +(p.wd?' \u2212 '+money(p.wd)+' already taken':'')
    +(p.bf>0?' + '+money(p.bf)+' brought forward':'')
    +(p.bf<0?' \u2212 '+money(-p.bf)+' owed from last month':'');}
