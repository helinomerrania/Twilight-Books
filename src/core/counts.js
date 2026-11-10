import {S} from '../state.js';
import {num} from '../util/money.js';
import {byDate} from '../util/dates.js';
import {cashOnHand, inHands, potBalance, pots} from './pots.js';

/* ---- cash counts */
export function countedTotal(r){if(r.counts)return Object.values(r.counts).reduce((a,v)=>a+num(v),0);
  return num(r.counted);}

export function countRows(){return byDate(S.rc)
  .filter(r=>r.counts?Object.keys(r.counts).length>0:r.counted!=null)
  .map(r=>{
  const expected=cashOnHand(r.d)+inHands(r.d),split=!!r.counts;
  const perPot=split?pots().map(p=>({name:p.name,kind:p.kind||'own',
      counted:r.counts[p.name]==null?null:num(r.counts[p.name]),expected:potBalance(p.name,r.d)})):null;
  const counted=countedTotal(r);
  const expOwn=cashOnHand(r.d);
  /* Only the pots that were actually counted are judged. Counting the Box and
     leaving the Bank alone used to report the Bank's whole balance as missing. */
  const base=split
    ? pots().filter(p=>r.counts[p.name]!=null&&r.counts[p.name]!=='')
            .reduce((a,p)=>a+potBalance(p.name,r.d),0)
    : expOwn;
  return {r,split,perPot,counted,expected:base,diff:counted-base};});}
