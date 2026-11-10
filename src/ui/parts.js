import {S} from '../state.js';
import {cls, esc, money, noteSize, num, qty} from '../util/money.js';
import {monthName, monthOf, shiftMonth, today, ymd} from '../util/dates.js';
import {cashOnHand, ownPots, potOf} from '../core/pots.js';
import {catLetter, itemQty, priceOf, tareOf} from '../core/stock.js';
import {elecBilled, elecCalc, elecFactors, elecOwed, elecPaid} from '../core/electricity.js';
import {frozen} from '../core/months.js';
import {dueBills, dueElec, dueFixed, duePartners, dueSalaries, dueSuppliers} from '../core/settle.js';
import {drillRows, share} from '../core/flow.js';
import {LOG_VERB, UNDO_WORD, canUndo, logWhen} from '../store/log.js';
import {dm, opts, potOpts, tbl, tile} from './dom.js';

export function drillTable(name){
  const rows=drillRows(name);
  if(!rows.length)return '<div class="drill"><div class="empty">Nothing this month.</div></div>';
  const o=rows.reduce((a,e)=>a+num(e.out),0),i=rows.reduce((a,e)=>a+num(e.in),0),dash='\u2014';
  return `<div class="drill">
    <div class="row" style="justify-content:flex-end;margin-bottom:6px">
      <button class="mini" data-act="printName" data-x="${esc(name)}">Print ${esc(name)}</button></div>
    ${tbl(
    `<th>Date</th><th>Kind</th><th>From</th><th class="num">Out</th><th class="num">In</th>`,
    rows.map(e=>`<tr><td>${esc(ymd(e.d))}</td><td>${esc(e.t)}</td><td>${esc(potOf(e))}</td>
      <td class="num">${num(e.out)?money(e.out):dash}</td>
      <td class="num">${num(e.in)?money(e.in):dash}</td></tr>`).join(''),
    `<tr class="tot"><td colspan="3">${rows.length} entr${rows.length===1?'y':'ies'}</td>
      <td class="num">${o?money(o):dash}</td><td class="num">${i?money(i):dash}</td></tr>`)}</div>`;}

export function flowBlock(groups){
  if(!groups.length)return '';
  return groups.map(g=>`<div class="flowg">
    <div class="flowh"><span>${esc(g.t)}</span>
      <span class="val">${money(g.total)}</span>
      <button class="mini" data-act="printKind" data-k="${esc(g.t)}">Print</button></div>
    ${g.rows.map(r=>{const open=S.ui.drill===r[0];
      return `<button class="barbtn" data-act="drill" data-x="${esc(r[0])}" aria-expanded="${open}">
        <span>${esc(r[0])}</span>
        <span class="track"><span class="fill" style="width:${share(r[1],g.total)}%"></span></span>
        <span class="val">${money(r[1])} <span class="caret">${open?'\u25be':'\u203a'}</span></span>
      </button>${open?drillTable(r[0]):''}`;}).join('')}
  </div>`).join('');}

export function supTable(st){
  const prev=monthName(shiftMonth(monthOf(S.ui.start),-1));
  return `<div class="drill">
    <div class="row" style="justify-content:flex-end;margin-bottom:6px">
      <button class="mini" data-act="printSup" data-x="${esc(st.name)}">Print ${esc(st.name)}</button></div>
    ${tbl(`<th>Date</th><th>What</th><th class="num">Amount</th>`,
      `<tr><td>\u2014</td><td>Carried in from ${esc(prev)}</td><td class="num">${money(st.opening)}</td></tr>`+
      st.lines.map(l=>`<tr><td>${esc(dm(l.d))}</td><td>${esc(l.what)}</td>
        <td class="num ${l.amt<0?'pos':''}">${l.amt<0?'\u2212 '+money(-l.amt):money(l.amt)}</td></tr>`).join(''),
      `<tr class="tot"><td colspan="2">Owed at the end of ${esc(monthName(monthOf(S.ui.start)))}</td>
        <td class="num ${st.closing>0?'neg':''}">${money(st.closing)}</td></tr>`+
      `<tr><td colspan="2" class="sub">Their stock still in the warehouse</td>
        <td class="num">${money(st.stock)}</td></tr>`)}
  </div>`;}

export function recentCard(){
  const all=(S.log||[]).slice().reverse();
  const show=S.ui.logAll?all:all.slice(0,10);
  return `<div class="card">
    <div class="cardhead"><h2>Recent changes</h2>
      ${all.length?`<button class="mini" data-act="printLog">Print</button>`:''}</div>
    <p class="sub">Everything that has happened to the books, newest first. If something was a mistake, put it back from here.</p>
    ${!all.length?'<div class="empty">Nothing has changed yet.</div>':
      `<div class="logs">${show.map(e=>{
        const i=e.id||'';
        return `<div class="logrow ${e.k}">
          <span class="logt">${esc(logWhen(e.t))}</span>
          <span class="logs2"><strong>${esc(LOG_VERB[e.k]||'')}</strong> ${esc(e.s)}
            ${e.who?`<span class="logw">${esc(e.who)}</span>`:''}
            ${e.undone?'<span class="logw">put back</span>':''}</span>
          <span>${canUndo(e)?`<button class="mini" data-act="undo" data-i="${esc(i)}">${UNDO_WORD[e.k]}</button>`:''}</span>
        </div>`;}).join('')}</div>
      ${all.length>10?`<div class="row" style="margin-top:10px">
        <button class="mini" data-act="logAll">${S.ui.logAll?'Show just the last 10':'Show all '+all.length}</button></div>`:''}`}
  </div>`;}

export function closedBadge(){return frozen()?'<span class="badge">Closed</span>':'';}

export function periodCard(){
  const f=frozen(),m=monthOf(S.ui.start);
  return `<div class="card"><div class="row">
    <div><span class="flab">Month</span>
      <button class="btn ghost" data-act="prevM">‹</button>
      <strong style="padding:0 8px">${esc(monthName(m))}</strong>
      <button class="btn ghost" data-act="nextM">›</button>
      ${f?'<span class="badge">Closed</span>':''}</div>
  </div>${f?''
    : (S.ui.end<today()
       ? '<p class="note"><strong class="warnc">Ended but never closed.</strong> These figures are being recalculated with today\u2019s salaries, prices and shares \u2014 an estimate, not a record.</p>'
       : (S.ui.start>today()
          ? '<p class="note">Not started yet. Rent and salaries show because they are charged to every month in full.</p>'
          : ''))}</div>`;}

export function countVerdict(diff){
  return diff===0?'matches the books'
    :(diff<0?money(-diff)+' missing':money(diff)+' more than the books');}

export function totalVerdict(t){
  return t===0?'Everything ties.'
    :(t<0?money(-t)+' is missing across all pots.'
         :money(t)+' more than the books say \u2014 something came in that was not recorded.');}

/* ---------------------------------------------------------- electricity */
export function elecCard(){
  const f=elecFactors(),rows=elecCalc(monthOf(S.ui.start)).slice().reverse();
  const n=v=>v==null?'':num(v);
  return `<div class="card"><h2>Electricity</h2>
    <p class="sub">Three bills off one meter arrangement. Type the prices and the meter reading; the amounts are worked out and go to the Cashbook as Monthly Bill.</p>
    <div class="entry" style="margin-bottom:6px">
      <div><label>Private — amperes billed</label><input type="number" value="${f.privateAmps}" data-elecf="privateAmps"></div>
      <div><label>Elevator — amperes billed</label><input type="number" value="${f.elevatorAmps}" data-elecf="elevatorAmps"></div>
      <div><label>Elevator — shared between</label><input type="number" value="${f.elevatorShare}" data-elecf="elevatorShare"></div>
      <div><label>Public — price per unit</label><input type="number" value="${f.publicRate}" data-elecf="publicRate"></div>
      <div><label>Public — shared between</label><input type="number" value="${f.publicShare}" data-elecf="publicShare"></div>
    </div>
    <p class="note" style="margin-bottom:12px">Private = price per ampere × ${f.privateAmps}. Elevator = price per ampere × ${f.elevatorAmps} ÷ ${f.elevatorShare}. Public = units used × ${f.publicRate} ÷ ${f.publicShare}. Each rounded to ${noteSize()} on its own.</p>
    <div class="grid tiles" style="margin-bottom:12px">
      ${tile('Billed, all months',money(elecBilled()))}
      ${tile('Paid',money(elecPaid()))}
      ${tile('STILL OWED',money(elecOwed()),elecOwed()>0?'not yet paid':'settled',elecOwed()>0?'neg':'pos')}
    </div>
    ${tbl(`<th>Month</th><th class="num">Price/amp private</th><th class="num">PRIVATE</th><th class="num">Price/amp elevator</th><th class="num">ELEVATOR</th><th class="num">Meter now</th><th class="num">Meter last</th><th class="num">Units</th><th class="num">PUBLIC</th><th class="num">Total</th><th></th>`,
      rows.map(x=>`<tr>
        <td>${esc(monthName(x.row.m))}${x.closed?' <span class="pill">closed</span>':''}</td>
        <td class="num"><input type="number" step="${noteSize()}" value="${n(x.row.pp)}" data-elec="${esc(x.row.m)}" data-k="pp"></td>
        <td class="num">${x.priv==null?'—':money(x.priv)}</td>
        <td class="num"><input type="number" step="${noteSize()}" value="${n(x.row.pe)}" data-elec="${esc(x.row.m)}" data-k="pe"></td>
        <td class="num">${x.elev==null?'—':money(x.elev)}</td>
        <td class="num"><input type="number" value="${n(x.row.now)}" data-elec="${esc(x.row.m)}" data-k="now"></td>
        <td class="num"><input type="number" value="${x.last==null?'':x.last}" data-elec="${esc(x.row.m)}" data-k="last"></td>
        <td class="num ${x.units!=null&&x.units<0?'neg':''}">${x.units==null?'—':qty(x.units)}</td>
        <td class="num">${x.pub==null?'—':money(x.pub)}</td>
        <td class="num"><strong>${x.total==null?'—':money(x.total)}</strong></td>
        <td>${x.total==null?''
          :`<button class="mini" data-act="elecPay" data-m="${esc(x.row.m)}" style="color:var(--accent);border-color:var(--accent)">Record payment</button>`}</td>
      </tr>`).join(''))}
    ${rows.some(x=>x.units!=null&&x.units<0)?'<p class="note neg">A negative unit count means the meter reading went backwards — check the two readings.</p>':''}
    <p class="note">Each month's bill is charged to that month's profit as soon as it is worked out here, the same way rent is \u2014 using the power is the cost, paying for it is only cash moving. <strong>Record payment</strong> writes the cash out of the Cashbook and reduces what is owed; it does not change profit again.</p>
    ${elecOwed()>0?'<p class="note warnc">'+money(elecOwed())+' of electricity has been billed and not paid. It sits alongside your supplier debt.</p>':''}
  </div>`;
}

/* ---------------------------------------------------------- Stock & suppliers */
export function invHead(L){
  if(L==='A')return `<th>Flavour</th><th class="num">Bucket + tobacco (g)</th><th>Bucket</th><th class="num">Tare</th><th class="num">Kg</th><th class="num">Price/kg</th><th class="num">Value</th>`;
  if(L==='B')return `<th>Brand</th><th class="num">Cartons</th><th class="num">Blocks</th><th class="num">Packs</th><th class="num">Kg</th><th class="num">Price/kg</th><th class="num">Value</th>`;
  if(L==='E')return `<th>Item</th><th class="num">Cartons</th><th class="num">Loose buckets</th><th class="num">Total</th><th class="num">Price</th><th class="num">Value</th>`;
  return `<th>Item</th><th class="num">Packages</th><th class="num">Pieces</th><th>Unit</th><th class="num">Per unit</th><th class="num">Total</th><th class="num">Price</th><th class="num">Value</th>`;}

export function invRow(it,counts,date,ro){
  const c=counts[it.name]||{},L=catLetter(it.category),q=itemQty(it,counts),pr=priceOf(it,date);
  const inp=(k,step)=>ro?`<span>${c[k]==null||c[k]===''?'—':qty(c[k])}</span>`
    :`<input type="number" step="${step||'any'}" value="${c[k]==null||c[k]===''?'':num(c[k])}" data-inv="${esc(it.name)}" data-k="${k}">`;
  if(L==='A')return `<tr><td>${esc(it.name)}</td><td class="num">${inp('g','1')}</td>
    <td>${ro?esc(c.bucket||''):`<select data-inv="${esc(it.name)}" data-k="bucket">${opts((S.setup.tare||[]).map(t=>t.name),c.bucket)}</select>`}</td>
    <td class="num">${tareOf(c.bucket)}</td><td class="num">${qty(q)}</td><td class="num">${money(pr)}</td><td class="num">${money(q*pr)}</td></tr>`;
  if(L==='B')return `<tr><td>${esc(it.name)}</td><td class="num">${inp('cartons')}</td><td class="num">${inp('blocks')}</td><td class="num">${inp('packs')}</td>
    <td class="num">${qty(q)}</td><td class="num">${money(pr)}</td><td class="num">${money(q*pr)}</td></tr>`;
  if(L==='E')return `<tr><td>${esc(it.name)}</td><td class="num">${inp('cartons')}</td><td class="num">${inp('buckets')}</td>
    <td class="num">${qty(q)}</td><td class="num">${money(pr)}</td><td class="num">${money(q*pr)}</td></tr>`;
  return `<tr><td>${esc(it.name)}</td><td class="num">${inp('pkg')}</td><td class="num">${inp('pcs')}</td><td>${esc(it.unit||'')}</td>
    <td class="num">${num(it.per)||1}</td><td class="num">${qty(q)}</td><td class="num">${money(pr)}</td><td class="num">${money(q*pr)}</td></tr>`;}

/* ---------------------------------------------------------- settle up */
export function payLine(r,i,step){
  /* Every step used to number its inputs from zero, so the first supplier and the
     first bill were both called "pay0". The Pay button looked its amount up by
     that name and the browser handed back whichever came first on the page - the
     supplier - so the bill offered to pay the supplier's figure. */
  const id='pay'+(step||0)+'-'+i;
  return `<tr><td>${esc(r.x)}${r.guess&&r.amt?' <span class="pill">last month\u2019s amount</span>':''}
      ${r.note?`<br><span style="color:var(--muted);font-size:11px">${r.note}</span>`:''}</td>
    <td class="num">${r.over!=null
      ? `<span class="neg"><strong>${money(r.over)}</strong> over-drawn</span>`
      : (r.amt>0
        ? (r.editable
          ? `<input type="number" step="${noteSize()}" id="${id}" value="${num(r.amt)||''}" style="max-width:140px">`
          : `<strong>${money(r.amt)}</strong>`)
        : '')}</td>
    <td>${r.amt>0
      ? `<button class="btn primary" style="padding:5px 12px"
          data-act="pay" data-t="${esc(r.t)}" data-x="${esc(r.x)}" data-amt="${num(r.amt)}"
          ${r.editable?`data-in="${id}"`:''} ${r.month?`data-m="${esc(r.month)}"`:''}>Pay</button>`
      : (r.done?`<span class="pill ${r.done==='paid'?'pos':''}">${esc(r.done)}</span>`:'')}</td></tr>`;}

export function payStep(n,title,why,rows,doneMsg){
  const left=rows.filter(r=>r.amt>0).length;
  return `<div class="step"><div class="no">${n}</div><div>
    <h3>${esc(title)}${left?'':' <span class="pill pos">done</span>'}</h3><p>${why}</p>
    ${rows.length
      ? tbl(`<th>Who / what</th><th class="num">Amount</th><th></th>`,rows.map((r,i)=>payLine(r,i,n)).join(''))
      : `<p class="note pos" style="margin-top:6px">Nothing left \u2014 ${esc(doneMsg)}</p>`}
  </div></div>`;}

export function settleCard(){
  const sal=dueSalaries(),sup=dueSuppliers(),fix=dueFixed(),el=dueElec(),
        bil=dueBills(),par=duePartners();
  const total=[sal,sup,fix,el,bil,par].reduce((a,g)=>a+g.reduce((x,r)=>x+num(r.amt),0),0);
  const cash=cashOnHand();
  return `<div class="card"><h2>Settle up</h2>
    <p class="sub">Each Pay writes the Cashbook entry for you. Work down the list.</p>
    <div class="row" style="margin-bottom:12px">
      <div><span class="flab">Pay from</span><br><select id="settlePot">${potOpts(S.ui.d.pot,'own')}</select></div>
      <div><span class="flab">Dated</span><br><input type="date" id="settleDate" value="${esc(today())}"></div>
    </div>
    <p class="note" style="margin:-8px 0 12px">Dated the day the money leaves your hand. Whatever date you put, it settles
      <strong>${esc(monthName(monthOf(S.ui.start)))}</strong> &mdash; so paying last month&rsquo;s bills today clears last month
      and still leaves today&rsquo;s cash right.</p>
    <div class="grid tiles" style="margin-bottom:14px">
      ${tile('Still to pay',money(total),total?'across all the steps below':'everything is settled',total?'':'pos')}
      ${tile('Cash on hand',money(cash),ownPots().map(p=>p.name).join(' + '),cls(cash))}
      ${tile('After paying it all',money(cash-total),cash-total<0?'you are short':'what would be left',cash-total<0?'neg':'')}
    </div>
    <div class="steps">
      ${payStep(1,'Salaries','Less the advances taken.',sal,'every salary is paid')}
      ${payStep(2,'Suppliers','What you have used and not paid for \u2014 owed, less their stock still here.',sup,'nothing owed')}
      ${payStep(3,'Rent & fixed','Already charged to the month.',fix,'rent is paid')}
      ${payStep(4,'Electricity','Already charged to the month it was used.',el,'nothing owed')}
      ${payStep(5,'Other bills','Pay before the partners \u2014 these change what each partner is owed.',bil,'nothing outstanding')}
      ${payStep(6,'Partners','Each share, less what they already took.',par,'both are square')}
      ${par.some(p=>p.over)?'<p class="note">An over-drawn partner has taken more than their share \u2014 that comes back, or carries into next month.</p>':''}
    </div>
    ${total&&cash-total<0?`<p class="note warnc">Paying everything leaves you ${money(cash-total)}. Pay what you can \u2014 the rest stays on this list.</p>`:''}
  </div>`;}

/* ---------------------------------------------------------- Setup */
export function editor(title,sub,rows,cols,addAct,delAct,kind){
  return `<div class="card"><h2>${esc(title)}</h2><p class="sub">${sub}</p>
    ${tbl(cols.map(c=>`<th class="${c.num?'num':''}">${esc(c.label)}</th>`).join('')+'<th></th>',
      rows.map((r,i)=>`<tr>${cols.map(c=>`<td class="${c.num?'num':''}">${c.opts
        ?`<select data-set="${kind}" data-i="${i}" data-k="${c.k}">${opts(c.opts(),r[c.k])}</select>`
        :`<input ${c.num?'type="number" step="any"':''} value="${esc(r[c.k]==null?'':r[c.k])}" data-set="${kind}" data-i="${i}" data-k="${c.k}">`}</td>`).join('')}
        <td><button class="mini" data-act="${delAct}" data-i="${i}">Remove</button></td></tr>`).join(''))}
    <div class="row" style="margin-top:10px"><button class="btn ghost" data-act="${addAct}">Add row</button></div></div>`;}
