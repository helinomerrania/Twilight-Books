import {S} from '../state.js';
import {cls, money} from '../util/money.js';
import {endOfMonth, monthOf, today} from '../util/dates.js';
import {cashOnHand, inHands} from '../core/pots.js';
import {result} from '../core/pnl.js';
import {$, bar} from './dom.js';

/* ============================================================ render */
export const VIEWS={};

export function render(){
  if(!S.setup){bar();$('#tab-'+S.ui.tab).innerHTML=
    `<div class="card"><h2>No books here yet</h2><p class="sub">This page holds the cash, stock and settlement records for the lounge.</p></div>`;
    return;}
  if(!S.setup.pots)S.setup.pots=[{name:'Box',kind:'own'},{name:'Home',kind:'own'},{name:'Bank',kind:'own'}];
  if(!S.ui.start){const ym=monthOf(today());S.ui.start=ym+'-01';S.ui.end=endOfMonth(ym);}
  bar();
  const host=$('#tab-'+S.ui.tab);
  const keep={};host.querySelectorAll('input[id],select[id]').forEach(el=>{keep[el.id]=el.value;});
  const active=document.activeElement&&document.activeElement.id;
  host.innerHTML=(VIEWS[S.ui.tab]||(()=>''))();
  host.querySelectorAll('input[id],select[id]').forEach(el=>{
    if(keep[el.id]!==undefined&&el.dataset.keep!=='no')el.value=keep[el.id];});
  if(active){const el=host.querySelector('#'+CSS.escape(active));if(el)el.focus();}
  header();
}

export function header(){
  if(!S.setup)return;
  const r=result();
  $('#bizname').textContent=(S.setup.business&&S.setup.business.name)||'Twilight';
  const upto=today();
  $('#hdCash').innerHTML='<span class="'+cls(cashOnHand(upto))+'">'+money(cashOnHand(upto))+'</span>';
  $('#hdFloat').innerHTML='<span class="floatc">'+money(inHands(upto))+'</span>';
  $('#hdNet').innerHTML='<span class="'+cls(r.net)+'">'+money(r.net)+'</span>';
}
