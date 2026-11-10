import {S} from '../state.js';
import {esc, money, num} from '../util/money.js';
import {monthName, monthOf, shiftMonth, today} from '../util/dates.js';
import {supAll, supStatement} from '../core/suppliers.js';
import {cashFlow, drillRows} from '../core/flow.js';
import {LOG_VERB, logWhen} from '../store/log.js';
import {dm} from './dom.js';

export function slipLog(){
  const all=(S.log||[]).slice().reverse().slice(0,40);
  if(!all.length)return slipHead('Recent changes')+'<div class="sl-row"><span>Nothing yet.</span></div>';
  return slipHead('Recent changes')+all.map(e=>
    `<div class="sl-row"><span>${esc(logWhen(e.t))} ${esc((LOG_VERB[e.k]||'')+' '+e.s)}</span><b></b></div>`).join('');}

export function slipHead(title){
  const biz=(S.setup.business&&S.setup.business.name)||'Twilight',n=new Date();
  const hh=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
  return `<div class="sl-biz">${esc(biz)}</div>
    <div class="sl-title">${esc(title)}</div>
    <div class="sl-meta">${esc(monthName(monthOf(S.ui.start)))}</div>
    <div class="sl-meta">printed ${esc(today())} ${hh}</div>
    <div class="sl-rule"></div>`;}

export function slipRows(rows){
  return rows.map(e=>`<div class="sl-row"><span>${dm(e.d)} ${esc(e.t)}</span>
    <b>${num(e.out)?money(e.out):'+'+money(e.in)}</b></div>`).join('');}

export function slipName(name){
  const rows=drillRows(name);
  if(!rows.length)return slipHead(name)+'<div class="sl-row"><span>Nothing this month.</span></div>';
  const o=rows.reduce((a,e)=>a+num(e.out),0),i=rows.reduce((a,e)=>a+num(e.in),0);
  return slipHead(name)+slipRows(rows)+`<div class="sl-rule"></div>`+
    (o?`<div class="sl-row sl-tot"><span>Out</span><b>${money(o)}</b></div>`:'')+
    (i?`<div class="sl-row sl-tot"><span>In</span><b>${money(i)}</b></div>`:'')+
    `<div class="sl-row"><span>${rows.length} entr${rows.length===1?'y':'ies'}</span><b></b></div>`;}

export function slipKind(kind){
  const fl=cashFlow(),g=fl.out.concat(fl.inn).filter(x=>x.t===kind)[0];
  if(!g)return slipHead(kind)+'<div class="sl-row"><span>Nothing this month.</span></div>';
  return slipHead(kind)+
    g.rows.map(r=>`<div class="sl-row"><span>${esc(r[0])}</span><b>${money(r[1])}</b></div>`).join('')+
    `<div class="sl-rule"></div><div class="sl-row sl-tot"><span>Total</span><b>${money(g.total)}</b></div>`;}

export function slipAll(){
  const fl=cashFlow();
  const part=(label,groups)=>!groups.length?'':`<div class="sl-sub">${label}</div>`+
    groups.map(g=>`<div class="sl-row sl-tot"><span>${esc(g.t)}</span><b>${money(g.total)}</b></div>`+
      g.rows.map(r=>`<div class="sl-row"><span>&nbsp;&nbsp;${esc(r[0])}</span><b>${money(r[1])}</b></div>`).join('')
    ).join('<div class="sl-rule"></div>');
  const o=fl.out.reduce((a,g)=>a+g.total,0),i=fl.inn.reduce((a,g)=>a+g.total,0);
  return slipHead('Where the money went')+part('Went out',fl.out)+
    (fl.inn.length?'<div class="sl-rule"></div>'+part('Came in',fl.inn):'')+
    `<div class="sl-rule"></div>
     <div class="sl-row sl-tot"><span>Out</span><b>${money(o)}</b></div>
     <div class="sl-row sl-tot"><span>In</span><b>${money(i)}</b></div>`;}

export function slipSup(name){
  const st=supStatement(name),prev=monthName(shiftMonth(monthOf(S.ui.start),-1));
  return slipHead(st.name)+
    `<div class="sl-row"><span>Carried in from ${esc(prev)}</span><b>${money(st.opening)}</b></div>`+
    (st.lines.length?'<div class="sl-rule"></div>':'')+
    st.lines.map(l=>`<div class="sl-row"><span>${esc(dm(l.d))} ${l.what.replace(/<[^>]*>/g,'')}</span>
      <b>${l.amt<0?'\u2212'+money(-l.amt):money(l.amt)}</b></div>`).join('')+
    `<div class="sl-rule"></div>`+
    (st.bought?`<div class="sl-row"><span>Received this month</span><b>${money(st.bought)}</b></div>`:'')+
    (st.paid?`<div class="sl-row"><span>Paid this month</span><b>\u2212${money(st.paid)}</b></div>`:'')+
    `<div class="sl-row sl-tot"><span>Owed now</span><b>${money(st.closing)}</b></div>
     <div class="sl-rule"></div>
     <div class="sl-row"><span>Their stock still here</span><b>${money(st.stock)}</b></div>`;}

export function slipSupAll(){
  const all=supAll();
  if(!all.length)return slipHead('Suppliers')+'<div class="sl-row"><span>Nothing this month.</span></div>';
  return slipHead('Suppliers')+
    all.map(st=>`<div class="sl-row sl-tot"><span>${esc(st.name)}</span><b>${money(st.closing)}</b></div>`+
      `<div class="sl-row"><span>&nbsp;&nbsp;carried in</span><b>${money(st.opening)}</b></div>`+
      (st.bought?`<div class="sl-row"><span>&nbsp;&nbsp;received</span><b>${money(st.bought)}</b></div>`:'')+
      (st.paid?`<div class="sl-row"><span>&nbsp;&nbsp;paid</span><b>\u2212${money(st.paid)}</b></div>`:'')
    ).join('<div class="sl-rule"></div>')+
    `<div class="sl-rule"></div>
     <div class="sl-row sl-tot"><span>Owed in all</span><b>${money(all.reduce((a,x)=>a+x.closing,0))}</b></div>`;}

export function printSlip(html){
  const el=document.getElementById('slip');if(!el)return;
  el.innerHTML=html+'<div class="sl-end">- - -</div>';
  document.body.classList.add('slipping');
  const tidy=()=>{document.body.classList.remove('slipping');el.innerHTML='';};
  window.addEventListener('afterprint',tidy,{once:true});
  setTimeout(()=>{try{window.print();}catch(e){}setTimeout(tidy,1500);},50);}
