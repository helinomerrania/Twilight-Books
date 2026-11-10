import {S, XFER} from '../state.js';
import {num} from '../util/money.js';
import {ymd} from '../util/dates.js';

/* ============================================================ pots */
export function pots(){const p=(S.setup&&S.setup.pots)||[];
  return p.length?p:[{name:'Box',kind:'own'}];}

export function ownPots(){return pots().filter(p=>p.kind!=='float');}

export function floatPots(){return pots().filter(p=>p.kind==='float');}

export function defaultPot(){const o=ownPots();return o.length?o[0].name:'Box';}

export function potOf(e){return e.p||defaultPot();}

/* balance of one pot up to and including a date (blank = everything) */
export function potBalance(name,upto){let t=0;
  for(const e of S.cb){
    if(upto&&ymd(e.d)>ymd(upto))continue;
    if(e.t===XFER){const a=num(e.out)||num(e.in);
      if(potOf(e)===name)t-=a; if(e.p2===name)t+=a; continue;}
    if(potOf(e)!==name)continue;
    t+=num(e.in)-num(e.out);
  }
  return t;}

export function cashOnHand(upto){return ownPots().reduce((a,p)=>a+potBalance(p.name,upto),0);}

export function inHands(upto){return floatPots().reduce((a,p)=>a+potBalance(p.name,upto),0);}
