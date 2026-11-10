import {S, SEED} from '../state.js';
import {esc} from '../util/money.js';
import {today} from '../util/dates.js';
import {applyAll, idbGet, idbSet, readLocal, snapshotAll, stampOf, storeOK, writeLocal} from './local.js';
import {noteChanges} from './log.js';
import {flash, note} from '../ui/dom.js';
import {render} from '../ui/render.js';

export async function connect(){
  const saved=readLocal();
  BK.freshStart=!saved;
  /* Work out where the backups live before a single byte is written. A browser that
     has never seen these books would otherwise start from the built-in sample and
     write that straight over a real backup. */
  await bkDetect();
  let start=saved,tookFolder=false,unreadable=false,heldBack=false;
  if(BK.mode==='helper'){
    /* One set of books for every device: they live in the folder, not in a browser.
       Which copy is newer is settled by the folder's own clock - the seq the helper
       reports - because two devices' clocks disagree and the faster one would win
       every time. If the folder has not moved since we last wrote it, what is here
       may include work done while the helper was closed, so it stays. */
    const got=await bkFetchBooks();
    if(!got.ok)unreadable=true;
    else if(got.data){
      let ours=false,unsent=false;
      try{ours=(localStorage.getItem('tw-lastSeq')||'')===String(BK.seq||'');
          unsent=localStorage.getItem('tw-unsent')==='1';}catch(e){}
      /* Work that never reached the folder always wins: it exists nowhere else.
         Otherwise the folder is taken whenever it has moved since this device
         last wrote it, because then another device has been at it. */
      if(!saved)              {start=got.data;tookFolder=true;BK.freshStart=false;}
      else if(unsent)         {heldBack=true;}
      else if(!ours||stampOf(got.data)>stampOf(saved))
                              {start=got.data;tookFolder=true;BK.freshStart=false;}
    }
  }
  applyAll(start||SEED);
  BK.stamp=stampOf(start);
  noteChanges();
  if(tookFolder)writeLocal(true);
  else if(!saved&&storeOK)writeLocal();
  S.db=true;
  try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist();}catch(e){}
  if(BK.state==='ready'&&!tookFolder&&!unreadable)bkWrite(false);
  /* said after the catching-up save, or the save's own "all clear" would wipe it */
  if(heldBack)setTimeout(()=>flash('This device had entries that never reached the folder. '
    +'They were kept and have now been written up.'),3500);
  if(unreadable)note('The books in the folder could not be read just now, so nothing has been '
    +'written over them. What is on this screen is this device\u2019s own copy. '
    +'Reopen Start Twilight, then reload this page.');
  bkWatch();
  if(!storeOK)note('This browser will not store anything. Work here is lost when the page closes — save a backup file from the Setup tab.');
  else if(BK.state==='needs')showGate();
}

export function bkWatch(){
  if(BK.mode!=='helper'||bkWatch.on)return;
  bkWatch.on=setInterval(async function(){
    /* something typed here is still on its way to the folder: leave it alone */
    if(BK.state!=='ready'||BK.pending||BK.dirty)return;
    let j=null;
    try{const r=await fetch('state',{cache:'no-store'});if(!r.ok)return;j=await r.json();}catch(e){return;}
    if(!j||!j.seq||j.seq===BK.seq)return;
    const got=await bkFetchBooks();
    if(!got.ok||!got.data)return;            /* could not be read: try again next tick */
    const d=got.data;
    if(stampOf(d)<=BK.stamp){BK.seq=j.seq;return;}
    const a=document.activeElement;
    if(a&&(a.tagName==='INPUT'||a.tagName==='SELECT'))return;   /* mid-entry: come back next tick */
    BK.seq=j.seq;BK.stamp=stampOf(d);
    applyAll(d);writeLocal(true);render();
    flash('Brought up to date \u2014 these books were changed on another device.');
  },5000);}

/* the books already sitting in the backup folder, if there are any */
export async function bkFetchBooks(){
  /* {ok:true,data} - read it.  {ok:true,data:null} - the folder has none yet.
     {ok:false} - could not be read, which is NOT the same thing: nothing may be
     written over books we have failed to look at. */
  try{
    if(BK.mode==='helper'){const r=await fetch('books',{cache:'no-store'});
      if(r.status===404)return {ok:true,data:null};
      if(!r.ok)return {ok:false};
      const d=await r.json();return {ok:true,data:(d&&d.setup)?d:null};}
    if(BK.dir){const fh=await BK.dir.getFileHandle('twilight-books.json');
      const d=JSON.parse(await (await fh.getFile()).text());return {ok:true,data:(d&&d.setup)?d:null};}
  }catch(e){
    if(e&&(e.name==='NotFoundError'))return {ok:true,data:null};
    return {ok:false};}
  return {ok:true,data:null};}

/* the moment a folder becomes reachable: never write the sample over real books */
export async function bkAdopt(){
  if(!BK.freshStart)return false;
  BK.freshStart=false;
  const got=await bkFetchBooks();
  if(!got.ok||!got.data)return false;
  const d=got.data;
  applyAll(d);writeLocal();render();
  flash('Picked up the books already in '+BK.name+'.');
  return true;}

/* Windows re-asks for the folder every time this page opens, so ask straight away
   rather than leaving a note on a tab nobody visits. Nothing can be typed until
   it is answered one way or the other. */
export function showGate(){
  const g=document.getElementById('gate');if(!g)return;
  const f=document.getElementById('gateFolder');if(f)f.textContent=BK.name||'backup';
  g.hidden=false;document.body.style.overflow='hidden';}

export function hideGate(){
  const g=document.getElementById('gate');if(g)g.hidden=true;
  document.body.style.overflow='';}

export function gateSay(msg,why){
  const m=document.getElementById('gateMsg');if(m)m.innerHTML=msg;
  const w=document.getElementById('gateWhy');if(w&&why!=null)w.textContent=why;}

export async function gateAllow(){
  if(!BK.dir)return gateOther();
  gateSay('Waiting for Chrome\u2026');
  let p=null;
  try{p=await BK.dir.requestPermission({mode:'readwrite'});}
  catch(e){
    gateSay('That folder could not be reached \u2014 it may have been moved, renamed or deleted.',
            'Choose the folder again, or open without backing up and set it later on the Setup tab.');
    return;}
  if(p!=='granted'){
    gateSay('Chrome did not give permission, so nothing can be written to <strong>'+esc(BK.name)+'</strong>.',
            'Press the button again and choose Allow, or open without backing up.');
    return;}
  BK.state='ready';
  await bkAdopt();
  const ok=await bkWrite(true);
  hideGate();note('');render();
  flash(ok?('Backups to '+BK.name+' are running again.')
          :('Allowed, but nothing could be written to '+BK.name+' yet.'));}

export async function gateOther(){
  await bkChoose();
  if(BK.state==='ready'){hideGate();note('');}
  else gateSay('No folder was chosen.','Pick a folder, or open without backing up and set it later on the Setup tab.');}

export function gateSkip(){
  hideGate();
  note('Nothing is being backed up this session. Tonight\u2019s work lives only in this browser until you allow the '
       +BK.name+' folder on the Setup tab.');}

/* ---- the backup folder: chosen once, remembered, written to on every change */
export const BK={dir:null,state:'none',last:null,lastDaily:null,name:'',remember:true,mode:'picker',err:false,freshStart:false,who:'',dirty:false,added:[],seq:'',stamp:0,pending:false};

export async function bkDetect(){
  /* Served by the helper on this computer? Then it does the writing and the browser
     is never asked for anything. Opened as a loose file instead, fall back to the
     folder the browser remembers, which it re-asks about every time. */
  if(location.protocol==='http:'||location.protocol==='https:'){
    try{
      const r=await fetch('ping',{cache:'no-store'});
      if(r.ok){const j=await r.json();
        if(j&&j.ok){BK.mode='helper';BK.name=j.folder||'the Twilight folder';BK.state='ready';BK.seq=j.seq||'';
          BK.who=(!j.you||/^127\./.test(j.you))?'at the lounge':'from '+j.you;
          try{BK.lastDaily=localStorage.getItem('tw-lastDaily')||null;}catch(e){}
          return;}}
    }catch(e){}
  }
  if(!window.showDirectoryPicker){BK.state='unsupported';return;}
  try{
    const h=await idbGet('dir');
    if(!h){BK.state='none';return;}
    BK.dir=h;BK.name=h.name||'backup';
    const p=await h.queryPermission({mode:'readwrite'});
    BK.state=(p==='granted')?'ready':'needs';
    try{BK.lastDaily=localStorage.getItem('tw-lastDaily')||null;}catch(e){}
  }catch(e){BK.state='none';}}

export async function bkChoose(){
  let h;
  try{h=await window.showDirectoryPicker({mode:'readwrite',id:'twilight-backup'});}
  catch(e){if(e&&e.name!=='AbortError')flash('Could not open that folder: '+(e.message||e.name));return;}
  BK.dir=h;BK.name=h.name||'backup';BK.state='ready';BK.remember=true;
  try{await idbSet('dir',h);}catch(e){BK.remember=false;}
  await bkAdopt();
  const ok=await bkWrite(true);render();note('');
  flash(ok?('Every change is now also written to the '+BK.name+' folder.')
         :('The folder was accepted but nothing could be written to it yet.'));}

export async function bkReconnect(){
  if(!BK.dir)return bkChoose();
  try{
    const p=await BK.dir.requestPermission({mode:'readwrite'});
    if(p==='granted'){BK.state='ready';await bkWrite(true);render();note('');flash('Backups to '+BK.name+' are running again.');}
    else flash('Permission was not given, so nothing is being backed up.');
  }catch(e){flash('Could not reconnect: '+(e.message||e.name));}}

export async function bkStop(){
  try{await idbSet('dir',null);}catch(e){}
  BK.dir=null;BK.state='none';BK.name='';render();
  flash('Automatic backups stopped. The folder and its files are untouched.');}

export let bkT=null;

export function bkSoon(){if(BK.state!=='ready')return;BK.dirty=true;
  clearTimeout(bkT);bkT=setTimeout(()=>bkWrite(false),2500);}

export async function bkPut(name,txt){
  const fh=await BK.dir.getFileHandle(name,{create:true});
  const w=await fh.createWritable();await w.write(txt);await w.close();}

export function bkTick(){const el=document.getElementById('bkStatus');if(el)el.textContent=bkText();}

export async function bkWrite(force){
  if(BK.state!=='ready')return false;
  const snap=snapshotAll(),txt=JSON.stringify(snap,null,1),d=today();
  if(BK.mode==='helper'){
    BK.pending=true;
    try{
      let r=await fetch('save',{method:'POST',
        headers:{'Content-Type':'application/json','X-Twilight':'1','X-Twilight-Seq':String(BK.seq||'')},
        body:txt});
      if(r.status===409){
        /* Another device saved between our reading the books and writing them.
           Take its copy and put our own new entries on top, rather than letting
           one of the two evenings disappear. */
        const got=await bkFetchBooks();
        if(got.ok&&got.data){
          const mine=BK.added.slice();
          applyAll(got.data);
          let put=0;
          mine.forEach(a=>{const arr=a.w==='cb'?S.cb:(a.w==='pu'?S.pu:S.rc);
            if(!arr.some(x=>x.id===a.row.id)){arr.push(a.row);put++;}});
          try{const j=await r.json();if(j&&j.seq)BK.seq=j.seq;}catch(e){}
          const snap2=snapshotAll();
          r=await fetch('save',{method:'POST',
            headers:{'Content-Type':'application/json','X-Twilight':'1','X-Twilight-Seq':String(BK.seq||'')},
            body:JSON.stringify(snap2,null,1)});
          if(r.ok){BK.stamp=stampOf(snap2);render();
            if(put)flash('Another device had saved first \u2014 '+put+' of your entries were put back on top of it.');}
        }
      }
      if(!r.ok)throw new Error('the helper refused it');
      try{const j=await r.json();if(j&&j.seq)BK.seq=j.seq;}catch(e){}
      BK.last=new Date();BK.lastDaily=d;BK.err=false;BK.pending=false;BK.dirty=false;
      BK.added=[];
      if(!BK.stamp||BK.stamp<stampOf(snap))BK.stamp=stampOf(snap);
      try{localStorage.removeItem('tw-unsent');}catch(e){}
      try{localStorage.setItem('tw-lastSeq',String(BK.seq||''));}catch(e){}
      try{localStorage.setItem('tw-lastDaily',d);}catch(e){}
      note('');bkTick();return true;
    }catch(e){
      /* the window was closed, or the computer is busy — keep the books, keep trying */
      BK.err=true;BK.pending=false;
      /* survives closing the app: on the way back in, this copy must not be
         replaced by an older one sitting in the folder */
      try{localStorage.setItem('tw-unsent','1');}catch(e){}
      note('The Twilight helper window is not answering, so nothing is being copied to '+BK.name
           +' right now. The books are safe in this browser. Reopen "Start Twilight" and it picks up again.');
      bkTick();return false;}
  }
  if(!BK.dir)return false;
  try{
    await bkPut('twilight-books.json',txt);
    if(force||BK.lastDaily!==d){
      await bkPut('twilight-books-'+d+'.json',txt);
      BK.lastDaily=d;try{localStorage.setItem('tw-lastDaily',d);}catch(e){}}
    BK.last=new Date();
    const el=document.getElementById('bkStatus');if(el)el.textContent=bkText();
    return true;
  }catch(e){BK.state='needs';
    note('Could not write the backup to '+BK.name+'. Open Setup and press Reconnect.');
    render();return false;}}

export function bkText(){
  if(BK.mode==='helper')
    return BK.err
      ? 'Paused \u2014 the helper window is not answering. The books are safe here meanwhile.'
      : 'Saved into '+BK.name+' by the helper on this computer'
        +(BK.last?' \u00b7 last saved '+String(BK.last.getHours()).padStart(2,'0')+':'+String(BK.last.getMinutes()).padStart(2,'0'):'')
        +'. Nothing to allow, nothing to press.';
  if(BK.state==='unsupported')return 'This browser cannot write to a folder on its own — use the backup button instead.';
  if(BK.state==='none')return 'No backup folder chosen. Nothing is being copied anywhere.';
  if(BK.state==='needs')return 'Paused. The browser needs permission for the '+BK.name+' folder again.';
  return 'Writing to the '+BK.name+' folder'
    +(BK.last?' · last saved '+String(BK.last.getHours()).padStart(2,'0')+':'+String(BK.last.getMinutes()).padStart(2,'0'):'')
    +(BK.lastDaily===today()?' · today’s dated copy done':'')
    +(BK.remember===false?'. This browser cannot remember the folder, so it must be chosen again each time this page opens.':'.');}
