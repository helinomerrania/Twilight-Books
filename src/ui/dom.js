import {S, TABS} from '../state.js';
import {esc} from '../util/money.js';
import {ymd} from '../util/dates.js';
import {defaultPot, ownPots, pots} from '../core/pots.js';
import {header, render} from './render.js';

/* ============================================================ helpers */
export const $=s=>document.querySelector(s);

/* note() is for things that stay until they are fixed; flash() is for a passing
   word. A flash must never clear a standing warning about saving. */
export let noteSticky=false;

export function note(t){const el=$('#dbnote');if(!el)return;noteSticky=!!t;el.textContent=t||'';el.hidden=!t;}

/* Rebuilding a tab throws away the field the person is moving to, so an edit made
   by typing waits until they have finished with the inputs altogether. */
export function renderLater(){clearTimeout(renderLater.t);renderLater.t=setTimeout(function(){
  const a=document.activeElement;
  if(a&&(a.tagName==='INPUT'||a.tagName==='SELECT')){renderLater();return;}
  render();},150);}

export function bar(){const nav=$('#tabs');
  if(nav.childElementCount!==TABS.length)
    nav.innerHTML=TABS.map(([k,l])=>`<button role="tab" data-tab="${k}">${l}</button>`).join('');
  nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===S.ui.tab));}

export function tile(k,v,n,c){return `<div class="tile"><div class="k">${esc(k)}</div><div class="v ${c||''}">${v}</div>${n?`<div class="n">${esc(n)}</div>`:''}</div>`;}

export function tbl(head,rows,foot){return `<div class="tblbox"><table><thead><tr>${head}</tr></thead><tbody>${rows||''}${foot||''}</tbody></table></div>`;}

export function opts(list,val){return (list||[]).map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('');}

export function potOpts(val,kind){const l=(kind==='own'?ownPots():pots()).map(p=>p.name);
  return opts(l.includes(val)||!val?l:[val].concat(l),val||defaultPot());}

/* ============================================================ actions */
export function byId(a,id){return a.find(r=>r.id===id);}

export function flash(m){if(noteSticky&&!m)return;const el=$('#dbnote');if(!el)return;
  el.textContent=m||'';el.hidden=!m;clearTimeout(flash.t);
  flash.t=setTimeout(()=>{if(!noteSticky){el.textContent='';el.hidden=true;}},6000);}

/* browsing is a view, not a setting — the app always opens on the current month */
/* ---- printing, on the till roll by the counter.
   Only the slip goes to the printer; the whole page steps aside and comes back. */
export function dm(d){const x=ymd(d);return x.slice(8,10)+'/'+x.slice(5,7);}

/* every number field here holds one value you are replacing, not editing, so
   arriving in one selects what is there and typing overwrites it.
   A click focuses and then its own mouseup collapses the selection, so the
   selection has to be made again after that. */
export function wantsAll(t){return t&&t.tagName==='INPUT'&&t.type==='number'&&t.value!=='';}

export function pickAll(t){try{t.select();}catch(e){}}

/* a menu choice is finished the moment it is made, so it may redraw at once;
   a typed figure may be one of several, so the redraw waits */
export function redraw(t){if(t&&t.tagName==='SELECT')render();else{header();renderLater();}}
