import {BK} from './helper.js';

/* Another device saved? Take its copy, unless ours is newer or something is being typed. */
/* ---- updating
   The helper does the downloading, because only it can write to the folder.
   The books are never part of an update: the helper keeps its own list of the
   files it will replace and no books file is on it, so there is nothing an
   update can do to what you have entered. */
export async function checkUpdate(el){
  const msg=document.getElementById('updmsg');
  const say=t=>{if(msg)msg.textContent=t;};
  if(el)el.disabled=true;
  say('Looking\u2026');
  try{
    const r=await fetch('update',{cache:'no-store'});
    const j=await r.json();
    if(j.status==='updated'){
      const kept=j.books?' Your books were copied to '+j.books+' first.':'';
      if(BK.dirty||BK.pending)
        say('Updated to '+j.version+'.'+kept+' Close and reopen Twilight to start using it.');
      else{say('Updated to '+j.version+'.'+kept+' Reloading\u2026');
        setTimeout(function(){location.reload();},1800);}
    }
    else if(j.status==='current')say('This is already the newest ('+j.version+').');
    else if(j.status==='offline')say('Could not reach GitHub just now. Nothing was changed.');
    else if(j.status==='off')say('Update checking is switched off in TwilightHelper.ps1.');
    else say('Could not update: '+(j.error||'something went wrong')+'. Nothing was changed.');
  }catch(e){say('The Twilight window did not answer.');}
  if(el)el.disabled=false;
}
