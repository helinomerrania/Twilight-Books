import {S} from '../state.js';
import {money, num, pct} from '../util/money.js';
import {deep} from '../util/obj.js';
import {localDay, monthName, rid, today, ymd} from '../util/dates.js';
import {booked} from '../core/stock.js';
import {elecCharged} from '../core/electricity.js';
import {countedTotal} from '../core/counts.js';
import {writeLocal} from './local.js';
import {BK} from './helper.js';
import {flash} from '../ui/dom.js';
import {render} from '../ui/render.js';

/* ---- what changed, and when
   Nothing reports its own changes; the books are simply compared with how they
   were a moment ago. That way every route in — typing, a Pay button, a device at
   home — is caught the same way, and nothing can quietly slip past. */
export let LAST=null;

export function loggable(){return {cb:S.cb,pu:S.pu,rc:S.rc,inv:S.inv,setup:S.setup,closed:S.closed,
  elec:S.elec,debt:S.debt,ledger:S.ledger};}

export function rowDesc(w,r){
  if(w==='cb')return r.t+' \u00b7 '+(r.x||'')+' \u00b7 '+(num(r.in)?money(r.in)+' in':money(r.out)+' out')+' \u00b7 '+ymd(r.d);
  if(w==='pu')return 'Receipt'+(r.no?' '+r.no:'')+' \u00b7 '+(r.s||'')+' \u00b7 '+money(r.amt)+' \u00b7 '+ymd(r.d);
  if(w==='rc')return 'Cash count '+ymd(r.d)+' \u00b7 '+money(countedTotal(r));
  return '';}

export function diffRows(w,a,b,out){
  const A={},B={};
  (a||[]).forEach(r=>{A[r.id]=r;});(b||[]).forEach(r=>{B[r.id]=r;});
  Object.keys(B).forEach(id=>{
    if(!A[id])out.push({k:'add',w,s:rowDesc(w,B[id]),row:deep(B[id])});
    else if(JSON.stringify(A[id])!==JSON.stringify(B[id]))
      out.push({k:'edit',w,s:rowDesc(w,A[id])+'  \u2192  '+rowDesc(w,B[id]),row:deep(B[id]),old:deep(A[id])});});
  Object.keys(A).forEach(id=>{if(!B[id])out.push({k:'del',w,s:rowDesc(w,A[id]),row:deep(A[id])});});}

export function diffSetup(a,b,out){
  if(!a||!b)return;
  [['staff','Salary','salary',1],['fixedExpenses','Fixed expense','amount',1],
   ['partners','Share','share',2],['pots','Cash pot',null,0]].forEach(function(spec){
    const k=spec[0],label=spec[1],f=spec[2],kind=spec[3],A={},B={};
    ((a[k])||[]).forEach(x=>{A[x.name]=x;});((b[k])||[]).forEach(x=>{B[x.name]=x;});
    Object.keys(B).forEach(n=>{
      if(!A[n])out.push({k:'edit',w:'setup',s:label+' added \u00b7 '+n});
      else if(f&&num(A[n][f])!==num(B[n][f]))
        out.push({k:'edit',w:'setup',s:label+' \u00b7 '+n+' \u00b7 '+
          (kind===2?pct(A[n][f]):money(A[n][f]))+' \u2192 '+(kind===2?pct(B[n][f]):money(B[n][f]))});});
    Object.keys(A).forEach(n=>{if(!B[n])out.push({k:'edit',w:'setup',s:label+' removed \u00b7 '+n});});});
  const A={},B={};
  ((a.stockItems)||[]).forEach(x=>{A[x.name]=x;});((b.stockItems)||[]).forEach(x=>{B[x.name]=x;});
  Object.keys(B).forEach(n=>{if(A[n]&&num(A[n].price)!==num(B[n].price))
    out.push({k:'edit',w:'setup',s:'Price \u00b7 '+n+' \u00b7 '+money(A[n].price)+' \u2192 '+money(B[n].price)});
    if(!A[n])out.push({k:'edit',w:'setup',s:'Stock item added \u00b7 '+n});});
  Object.keys(A).forEach(n=>{if(!B[n])out.push({k:'edit',w:'setup',s:'Stock item removed \u00b7 '+n});});
  if(JSON.stringify(a.suppliers||[])!==JSON.stringify(b.suppliers||[]))
    out.push({k:'edit',w:'setup',s:'Supplier list changed'});
  const an=(a.business||{}).name,bn=(b.business||{}).name;
  if(an!==bn)out.push({k:'edit',w:'setup',s:'Business name \u00b7 '+an+' \u2192 '+bn});
  const ar=num((a.business||{}).rounding),br=num((b.business||{}).rounding);
  if(ar!==br)out.push({k:'edit',w:'setup',s:'Smallest banknote \u00b7 '+money(ar)+' \u2192 '+money(br)});
  const ap={},bp={};
  ((a.pots)||[]).forEach(x=>{ap[x.name]=x.kind||'own';});((b.pots)||[]).forEach(x=>{bp[x.name]=x.kind||'own';});
  Object.keys(bp).forEach(n=>{if(ap[n]&&ap[n]!==bp[n])
    out.push({k:'edit',w:'setup',s:'Cash pot \u00b7 '+n+' \u00b7 '+ap[n]+' \u2192 '+bp[n]});});
  if(JSON.stringify(a.conversions||{})!==JSON.stringify(b.conversions||{}))
    out.push({k:'edit',w:'setup',s:'Unit conversions changed'});
  if(JSON.stringify(a.tare||[])!==JSON.stringify(b.tare||[]))
    out.push({k:'edit',w:'setup',s:'Bucket weights changed'});
  if(JSON.stringify(a.categories||[])!==JSON.stringify(b.categories||[]))
    out.push({k:'edit',w:'setup',s:'Stock categories changed'});}

export function diffInv(a,b,out){
  a=a||{};b=b||{};
  Object.keys(b).forEach(d=>{
    if(!a[d])out.push({k:'add',w:'inv',s:'Stock count opened \u00b7 '+d});
    else if(JSON.stringify(a[d])!==JSON.stringify(b[d]))
      out.push({k:'edit',w:'inv',s:'Stock count changed \u00b7 '+d+' \u00b7 '+money(booked(d))});});
  Object.keys(a).forEach(d=>{if(!b[d])out.push({k:'del',w:'inv',s:'Stock count deleted \u00b7 '+d});});}

export function diffSmall(a,b,out){
  a=a||{};b=b||{};
  Object.keys(b).forEach(m=>{if(!a[m])out.push({k:'add',w:'closed',s:'Month closed \u00b7 '+monthName(m)});});
  Object.keys(a).forEach(m=>{if(!b[m])out.push({k:'del',w:'closed',s:'Month reopened \u00b7 '+monthName(m)});});}

export function diffElec(a,b,out){
  const A=((a&&a.rows)||[]),B=((b&&b.rows)||[]),am={},bm={};
  A.forEach(r=>{am[r.m]=r;});B.forEach(r=>{bm[r.m]=r;});
  Object.keys(bm).forEach(m=>{if(JSON.stringify(am[m]||{})!==JSON.stringify(bm[m]))
    out.push({k:'edit',w:'elec',s:'Electricity \u00b7 '+monthName(m)+' \u00b7 '+money(elecCharged(m))});});
  if(JSON.stringify((a&&a.factors)||{})!==JSON.stringify((b&&b.factors)||{}))
    out.push({k:'edit',w:'elec',s:'Electricity rates changed'});}

export function noteChanges(){
  const now=loggable();
  if(!LAST){LAST=deep(now);return;}
  const out=[];
  diffRows('cb',LAST.cb,now.cb,out);
  diffRows('pu',LAST.pu,now.pu,out);
  diffRows('rc',LAST.rc,now.rc,out);
  diffSetup(LAST.setup,now.setup,out);
  diffInv(LAST.inv,now.inv,out);
  diffSmall(LAST.closed,now.closed,out);
  diffElec(LAST.elec,now.elec,out);
  if(JSON.stringify(LAST.debt||{})!==JSON.stringify(now.debt||{}))
    out.push({k:'edit',w:'debt',s:'Supplier debt brought forward changed \u00b7 as at '+((now.debt||{}).asAt||'\u2014')});
  if(JSON.stringify(LAST.ledger||[])!==JSON.stringify(now.ledger||[]))
    out.push({k:'edit',w:'ledger',s:'Partner ledger changed'});
  LAST=deep(now);
  if(!out.length)return;
  const at=new Date().toISOString(),who=BK.who||'';
  if(out.length>25)S.log.push({id:rid(),t:at,who,k:'note',w:'all',
    s:out.length+' things changed at once \u2014 a backup was loaded, most likely'});
  else out.forEach(e=>{e.id=rid();e.t=at;e.who=who;S.log.push(e);
    /* kept so that, if another device saved first, these can be put back on top
       of its copy instead of one of the two evenings being lost */
    if(e.k==='add'&&e.row&&(e.w==='cb'||e.w==='pu'||e.w==='rc'))BK.added.push({w:e.w,row:deep(e.row)});});
  if(S.log.length>200)S.log=S.log.slice(-200);}

/* ---- recent changes: the last things that happened to the books */
export function logWhen(t){
  const d=new Date(t);if(isNaN(d))return '';
  const hh=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const day=localDay(d);
  return day===today()?hh:(day.slice(8,10)+'/'+day.slice(5,7)+' '+hh);}

export function canUndo(e){return !e.undone&&e.id&&e.row&&(e.w==='cb'||e.w==='pu'||e.w==='rc')&&
  (e.k==='add'||e.k==='del'||(e.k==='edit'&&e.old));}

export const UNDO_WORD={add:'Remove it again',del:'Put it back',edit:'Change it back'};

export const LOG_VERB={add:'Added',del:'Deleted',edit:'Changed',note:''};

/* Putting one back is itself a change, so it shows up in the list too. */
export function undoLog(id){
  const e=(S.log||[]).find(x=>x.id===id);if(!e||!canUndo(e))return;
  const arr=e.w==='cb'?S.cb:(e.w==='pu'?S.pu:S.rc);
  const at=arr.findIndex(r=>r.id===e.row.id);
  /* Only undo what is still as it was. If the row has been touched since, say so
     rather than quietly throwing the newer change away. */
  if(at>=0&&JSON.stringify(arr[at])!==JSON.stringify(e.row)){
    flash('That has been changed again since. Put it right on the Cashbook instead.');return;}
  if(e.k==='add'){if(at>=0)arr.splice(at,1);}
  else if(e.k==='del'){if(at<0)arr.push(deep(e.row));else{flash('That is already back.');return;}}
  else{if(at>=0)arr[at]=deep(e.old);else{flash('That row is gone, so there is nothing to change back.');return;}}
  e.undone=true;
  writeLocal();render();
  flash(e.k==='del'?'Put back.':'Undone.');}
