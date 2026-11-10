import {S} from '../state.js';
import {money, noteSize, num, pct} from '../util/money.js';
import {daysBetween, inPer, monthShort, today, ymd} from '../util/dates.js';
import {floatPots, ownPots, potBalance, potOf, pots} from './pots.js';
import {elecBilled, elecOwed} from './electricity.js';
import {frozen, lastClosed} from './months.js';
import {result} from './pnl.js';
import {partners, payroll} from './people.js';
import {suppliers} from './suppliers.js';
import {countRows} from './counts.js';

/* ---- checks that watch the business */
export function checks(){
  const out=[],r=result(),prev=lastClosed(),pay=payroll(),sup=suppliers(),prt=partners();
  const add=(level,label,detail)=>out.push({level,label,detail});

  /* what matters is the part this month's salary cannot cover - that money is gone */
  const owing=pay.filter(p=>p.carry>0);
  if(owing.length){const deep=owing.filter(p=>p.carry>p.gross&&p.gross>0);
    add(deep.length?'bad':'warn',
      deep.length?'Advances have run past a whole extra month of salary':'Advances run past this month’s salary',
      owing.map(p=>p.name+' owes '+money(p.carry)+' into next month').join(' · '));}
  else add('ok','Every advance is covered by this month’s salary','nothing carried over');

  const fl=floatPots().map(p=>({name:p.name,bal:potBalance(p.name)})).filter(p=>p.bal!==0);
  if(fl.length)add(fl.some(p=>p.bal>1000000)?'warn':'ok','Cash in people’s hands',
    fl.map(p=>p.name+' '+money(p.bal)).join(' · '));
  else add('ok','Nobody is holding a float','all cash is in your own pots');

  if(r.cogs.raw<0){
    const gap=money(-r.cogs.raw);
    add('warn','More stock than can be accounted for',
      gap+' more on the shelf than the opening count plus the receipts for this month. '
      +'Either this is the first count, which only sets the opening position, or a delivery was never written down. '
      +'Cost of goods is shown as 0 rather than as a profit.');}

  const owed=sup.reduce((a,s)=>a+s.still,0);
  if(prev&&prev.suppliers){const was=prev.suppliers.reduce((a,s)=>a+s.still,0);
    const d=owed-was;
    add(d>0?'warn':'ok','Supplier debt '+(d>0?'rose':d<0?'fell':'unchanged')+' since '+monthShort(prev.month),
      d?money(was)+' → '+money(owed):money(owed)+' owed');}
  else add('ok','Supplier debt',money(owed)+' owed');

  if(prev&&prev.result&&r.rev>0){const d=(r.grossPct-prev.result.grossPct)*100;
    add(Math.abs(d)>5?'warn':'ok','Gross margin '+(d>=0?'up ':'down ')+Math.abs(d).toFixed(1)+' points vs '+monthShort(prev.month),
      pct(prev.result.grossPct)+' → '+pct(r.grossPct));}

  const shareTotal=((frozen()&&frozen().shares)||S.setup.partners||[]).reduce((a,p)=>a+num(p.share),0);
  if(Math.abs(shareTotal-1)>1e-9)
    add('bad','Partner shares add up to '+pct(shareTotal)+', not 100%',
      'each partner is getting his own share, so the profit is not fully shared out');

  const tookMore=prt.filter(p=>p.wd>p.profit&&p.profit>0);
  if(tookMore.length)add('warn','A partner has taken more than this month’s share',
    tookMore.map(p=>p.name+' took '+money(p.wd)+' of '+money(p.profit)).join(' · '));
  else add('ok','Partner withdrawals are inside their share','');

  const cr=countRows().filter(x=>inPer(x.r.d));
  const last=cr.length?cr[cr.length-1]:null;
  if(!last)add('warn','Cash has not been counted this month','count it on the Tonight tab');
  else{const age=daysBetween(ymd(last.r.d),today());
    if(Math.abs(last.diff)>=noteSize())
      add('bad','The last count is out by '+money(last.diff),'counted '+ymd(last.r.d)+(last.split?' — see which pot':''));
    else add(age>3?'warn':'ok','Counted cash matches the books',
      'last counted '+ymd(last.r.d)+(age>0?' ('+age+' day'+(age===1?'':'s')+' ago)':' (today)'));}

  const salesDays=new Set(S.cb.filter(e=>e.t==='Daily Sales'&&inPer(e.d)&&num(e.in)>0).map(e=>ymd(e.d)));
  const spendDays=new Set(S.cb.filter(e=>e.t==='Daily Expense'&&inPer(e.d)&&num(e.out)>0).map(e=>ymd(e.d)));
  const missing=[...spendDays].filter(d=>!salesDays.has(d)).sort();
  if(missing.length)add('bad',missing.length+' day'+(missing.length===1?'':'s')+' with spending but no sales recorded',
    missing.slice(0,6).join(', ')+(missing.length>6?' …':''));
  else if(!salesDays.size)add('warn','No sales recorded yet this month','enter the day’s takings on the Tonight tab');
  else add('ok','Every day with spending has a sales figure',salesDays.size+' days recorded');

  const cd=r.cogs.date;
  if(!cd||cd<S.ui.start)add('warn','No stock count in this month',cd?('last count '+cd):'never counted');
  else add('ok','Stock counted for this month',cd);

  const fz=frozen(),names={};
  ((fz&&fz.roster)||S.setup.staff||[]).forEach(s=>names[s.name]=1);
  ((fz&&fz.shares)||S.setup.partners||[]).forEach(p=>names[p.name]=1);
  (S.setup.suppliers||[]).forEach(s=>names[s]=1);
  ((fz&&fz.fixedExpenses)||S.setup.fixedExpenses||[]).forEach(x=>names[x.name]=1);
  const nameTypes=['Staff Advance','Salary Payment','Owner Advance','Owner Repayment',
    'Partner Settlement','Owner Capital In','Supplier Payment','Supplier Cash Purchase','Fixed Expense Payment'];
  const potNames={};pots().forEach(p=>{potNames[p.name]=1;});
  const lostPot=S.cb.filter(e=>inPer(e.d)&&!potNames[potOf(e)]);
  if(lostPot.length)add('bad',lostPot.length+' entr'+(lostPot.length===1?'y sits':'ies sit')+' in a pot that no longer exists',
    [...new Set(lostPot.map(e=>potOf(e)))].join(', ')+' \u2014 that money is not being counted');

  /* A pot is a real place money sits, so it cannot hold less than nothing. Below
     zero means it was paid out of before it was funded, or a payment was written
     down that never actually happened. */
  const days=[...new Set(S.cb.map(e=>ymd(e.d)))].sort(),dug=[];
  ownPots().forEach(p=>{let worst=null;
    for(const d of days){const b=potBalance(p.name,d);
      if(b<-0.5&&(!worst||b<worst.b))worst={d,b};}
    if(worst)dug.push(p.name+' down to '+money(worst.b)+' on '+worst.d);});
  if(dug.length)add('bad',dug.length===1?'A pot goes below zero':'Pots go below zero',
    dug.join(' \u00b7 ')+' \u2014 paid out of before it was put in, or a payment was recorded that never happened');

  const orphan=S.cb.filter(e=>inPer(e.d)&&nameTypes.includes(e.t)&&!names[e.x]);
  if(orphan.length)add('bad',orphan.length+(orphan.length===1?' entry points':' entries point')+' at a name the books do not know',
    [...new Set(orphan.map(e=>e.x))].join(', ')+' — that money is credited to nobody');
  else add('ok','Every entry matches a known name',fz?'checked against the closed roster':'');

  const eo=elecOwed();
  if(eo>0)add(eo>1000000?'bad':'warn','Electricity billed but not paid',
    money(eo)+' owed \u2014 the cost is already in profit, the cash has not left');
  else if(elecBilled())add('ok','Electricity paid up','nothing owed');

  const ns=noteSize();
  const odd=S.cb.filter(e=>inPer(e.d)&&((num(e.in)%ns)||(num(e.out)%ns)));
  if(odd.length)add('warn',odd.length+' amount'+(odd.length===1?'':'s')+' not payable in real notes',
    'not a multiple of '+ns);
  else add('ok','Every amount is payable in real notes','multiples of '+ns);
  return out;}
