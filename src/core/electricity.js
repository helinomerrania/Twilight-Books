import {EPAY, S} from '../state.js';
import {mround, num} from '../util/money.js';
import {monthOf, nextMonth} from '../util/dates.js';

/* ---- electricity
   Three separate bills share one meter arrangement:
     private  = price per ampere x amperes billed
     elevator = price per ampere x amperes billed, split between the flats
     public   = units used on the meter x price per unit, split between the flats
   Each is rounded to the note size on its own, exactly as the workbook did. */
export function elecFactors(){const f=(S.elec&&S.elec.factors)||{};
  const set=(v,dflt)=>(v==null||v==='')?dflt:num(v);
  return {privateAmps:set(f.privateAmps,25),elevatorAmps:set(f.elevatorAmps,20),
          elevatorShare:num(f.elevatorShare)||6,publicRate:set(f.publicRate,185),
          publicShare:num(f.publicShare)||3};}

export function elecDetails(){
  const mb=(S.setup.types||[]).find(t=>t.name==='Monthly Bill');
  const d=((mb&&mb.details)||[]).filter(x=>/electric/i.test(x));
  return d.length?d:['Electricity (Private)','Electricity (Elevator)','Electricity (Public)'];}

export function elecStored(){return ((S.elec&&S.elec.rows)||[]).slice().sort((a,b)=>a.m<b.m?-1:1);}

export function elecRows(withMonth){
  const rows=elecStored();
  if(withMonth&&!rows.some(r=>r.m===withMonth))rows.push({m:withMonth});
  rows.sort((a,b)=>a.m<b.m?-1:1);
  return rows;}

export function elecCalc(withMonth){
  const f=elecFactors(),rows=elecRows(withMonth),out=[];let prevNow=null;
  for(const r of rows){
    const last=r.last!=null&&r.last!==''?num(r.last):(prevNow!=null?prevNow:null);
    const now=r.now!=null&&r.now!==''?num(r.now):null;
    const units=(now!=null&&last!=null)?now-last:null;
    const priv=r.pp?mround(num(r.pp)*f.privateAmps):null;
    const elev=r.pe?mround(num(r.pe)*f.elevatorAmps/f.elevatorShare):null;
    const pub=units!=null?mround(units*f.publicRate/f.publicShare):null;
    const any=priv!=null||elev!=null||pub!=null;
    const total=any?num(priv)+num(elev)+num(pub):null;
    out.push({row:r,last,now,units,priv,elev,pub,total,closed:!!S.closed[r.m]});
    if(now!=null)prevNow=now;
  }
  return out;}

/* the bill belongs to the month the power was used, whether or not it has been paid */
export function elecCharged(month){const x=elecCalc().find(y=>y.row.m===month);return x&&x.total?x.total:0;}

export function elecInPeriod(){let t=0,m=monthOf(S.ui.start);
  while(m<=monthOf(S.ui.end)){t+=elecCharged(m);m=nextMonth(m);}
  return t;}

export function elecBilled(){return elecCalc().reduce((a,x)=>a+num(x.total),0);}

export function elecPaid(){const el=elecDetails();let t=0;
  for(const e of S.cb)if(e.t===EPAY||(e.t==='Monthly Bill'&&el.includes(e.x)))t+=num(e.out);
  return t;}

/* counted the same way the settle-up counts it, month by month, so the two agree */
export function elecOwed(){return elecCalc().reduce((a,x)=>a+Math.max(0,elecOwedFor(x.row.m)),0);}

/* ---- the settle-up list: every line stays on the list and says what became of it,
   so a salary swallowed by advances or a partner already paid is visible, not missing */
/* A payment written by the Pay button carries the month it settles. One typed in
   by hand as a Monthly Bill, or a row whose Type was changed later, carries no
   month at all - so it counts against the month it is dated in. Either way the
   money has left the box, and Still to Pay must stop asking for it. */
export function elecPaidFor(m){const el=elecDetails();let t=0;
  for(const e of S.cb){
    if(!(e.t===EPAY||(e.t==='Monthly Bill'&&el.includes(e.x))))continue;
    if(e.m?e.m!==m:monthOf(e.d)!==m)continue;
    t+=num(e.out);}
  return t;}

export function elecOwedFor(m){return elecCharged(m)-elecPaidFor(m);}
