import {LS, S} from '../state.js';
import {mround} from '../util/money.js';
import {deep} from '../util/obj.js';
import {monthOf, today, ymd} from '../util/dates.js';
import {hasCounts, stockValue} from '../core/stock.js';
import {LAST, loggable, noteChanges} from './log.js';
import {bkSoon} from './helper.js';
import {flash, note} from '../ui/dom.js';
import {render} from '../ui/render.js';

export let storeOK=true;

export function readLocal(){try{const r=localStorage.getItem(LS);return r?JSON.parse(r):null;}catch(e){storeOK=false;return null;}}

export function snapshotAll(){return {v:1,savedAt:new Date().toISOString(),
  setup:S.setup,cb:S.cb,pu:S.pu,rc:S.rc,inv:S.inv,ledger:S.ledger,closed:S.closed,debt:S.debt,elec:S.elec,log:S.log};}

export function applyAll(d){
  S.setup=d.setup||null;S.cb=d.cb||[];S.pu=d.pu||[];S.rc=d.rc||[];
  S.inv=d.inv||{};S.ledger=d.ledger||[];S.closed=d.closed||{};
  S.debt=d.debt||{asAt:null,brought:{}};S.elec=d.elec||null;S.log=d.log||[];}

export function writeLocal(quiet){
  if(quiet)LAST=deep(loggable()); else noteChanges();
  let ok=true;
  if(storeOK){try{localStorage.setItem(LS,JSON.stringify(snapshotAll()));}
    catch(e){storeOK=false;ok=false;
      note('This browser will not store the books (private window, or storage full). Save a backup file from the Setup tab before closing this page.');}}
  else ok=false;
  if(!quiet)bkSoon();
  return Promise.resolve(ok);}

export function stampOf(d){const t=Date.parse((d&&d.savedAt)||'');return isFinite(t)?t:0;}

export function saveSetup(){return writeLocal();}

export function saveLedger(){return writeLocal();}

export function saveDebt(){return writeLocal();}

export function saveElec(){return writeLocal();}

export function saveCb(){return writeLocal();}

export function saveYr(){return writeLocal();}

export function saveInv(date){const d=S.inv[date];
  if(d&&hasCounts(date)&&!S.closed[monthOf(date)])d.closing=mround(stockValue(date));
  return writeLocal();}

export function saveClosed(){return writeLocal();}

export function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('tw-books',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('h');};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}

export function idbGet(k){return idb().then(db=>new Promise((res,rej)=>{
  const q=db.transaction('h','readonly').objectStore('h').get(k);
  q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);}));}

export function idbSet(k,v){return idb().then(db=>new Promise((res,rej)=>{
  const q=db.transaction('h','readwrite').objectStore('h').put(v,k);
  q.onsuccess=()=>res();q.onerror=()=>rej(q.error);}));}

/* ---- the manual file, still there for moving between machines */
export function backupNow(){
  const blob=new Blob([JSON.stringify(snapshotAll(),null,1)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='twilight-books-'+today()+'.json';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  flash('Backup file saved to your downloads.');}

export function restoreFrom(file){
  const r=new FileReader();
  r.onload=()=>{try{
      const d=JSON.parse(r.result);
      if(!d||!d.setup)throw new Error('that file does not hold the books');
      applyAll(d);writeLocal();render();
      flash('Books restored from '+file.name+(d.savedAt?' (saved '+ymd(d.savedAt)+')':'')+'.');
    }catch(e){flash('Could not read that file: '+e.message);}};
  r.readAsText(file);}
