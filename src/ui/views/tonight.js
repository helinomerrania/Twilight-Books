import {NIGHT_NOTE, NIGHT_TYPES, S, XFER} from '../../state.js';
import {esc, money, noteSize, num} from '../../util/money.js';
import {byDate, today, ymd} from '../../util/dates.js';
import {cashOnHand, floatPots, inHands, potBalance, potOf, pots} from '../../core/pots.js';
import {typeDetails, typeNames} from '../../core/types.js';
import {opts, potOpts, tbl, tile} from '../dom.js';
import {countVerdict, totalVerdict} from '../parts.js';
import {VIEWS} from '../render.js';

/* ---------------------------------------------------------- Tonight */
VIEWS.tonight=function(){
  const d=S.ui.d.night||today();
  const rows=byDate(S.cb.filter(e=>ymd(e.d)===d));
  const sales=rows.filter(e=>e.t==='Daily Sales').reduce((a,e)=>a+num(e.in),0);
  const spent=rows.filter(e=>e.t==='Daily Expense'||e.t==='Monthly Bill').reduce((a,e)=>a+num(e.out),0);
  const nType=S.ui.d.nType||'Daily Expense';
  const all=typeDetails(nType);
  const dets=nType==='Daily Expense'?all.slice(0,10):all;
  const pick=(S.ui.d.cat&&all.includes(S.ui.d.cat))?S.ui.d.cat:(dets[0]||'');
  const rc=S.rc.find(r=>ymd(r.d)===d);
  const counted=rc&&rc.counts?rc.counts:{};
  const anyCount=Object.keys(counted).length>0;
  const potCards=pots().map((p,i)=>{
    const exp=potBalance(p.name,d),got=counted[p.name];
    const diff=got==null||got===''?null:num(got)-exp;
    return `<div class="pot ${p.kind==='float'?'isfloat':''}">
      <div class="nm">${esc(p.name)}${p.kind==='float'?' <span class="pill floatc">float</span>':''}</div>
      <div class="bal">${money(exp)}</div><div class="sub">books say</div>
      <input type="number" step="${noteSize()}" placeholder="count it" value="${got==null?'':num(got)}"
             id="cnt${i}" data-pot="${esc(p.name)}" inputmode="numeric">
      <div class="sub cdiff" data-cd="${esc(p.name)}">${diff==null?'':countVerdict(diff)}</div>
    </div>`;}).join('');
  const tdiff=anyCount?pots().reduce((a,p)=>a+(counted[p.name]==null?0:num(counted[p.name])-potBalance(p.name,d)),0):null;
  return `<div class="card"><div class="row" style="margin-bottom:12px">
      <h2 style="font-size:17px">Closing up</h2>
      <input type="date" id="nightDate" value="${esc(d)}" data-act="nightDate" style="margin-left:auto">
    </div>
    <div class="steps">
      <div class="step"><div class="no">1</div><div>
        <h3>Today's sales</h3><p>The one figure from the till.</p>
        <div class="row" style="margin-top:8px">
          <input type="number" step="${noteSize()}" id="nSales" class="big" style="max-width:260px"
                 placeholder="0" value="${sales?sales:''}">
          <button class="btn primary" data-act="nSales">${sales?'Update':'Save'} sales</button>
          ${sales?`<span class="note" style="margin:0">Recorded: ${money(sales)}</span>`:''}
        </div></div></div>
      <div class="step"><div class="no">2</div><div>
        <h3>What went out</h3><p>Pick what kind, tap who or what, type the amount, add.</p>
        <div class="quick" style="margin-top:8px">
          ${NIGHT_TYPES.filter(([t])=>typeNames().includes(t)).map(([t,short])=>
            `<button data-act="pickType" data-t="${esc(t)}" aria-pressed="${t===nType}">${esc(short)}</button>`).join('')}
        </div>
        <div class="quick" style="opacity:.92">
          ${dets.map(c=>`<button data-act="pickCat" data-cat="${esc(c)}" aria-pressed="${c===pick}"
             style="font-weight:500">${esc(c)}</button>`).join('')||'<span class="note" style="margin:0">Nothing set up for this yet — add it on the Setup tab.</span>'}
        </div>
        <div class="row">
          <select id="nCat" data-keep="no" style="min-width:160px">${opts(dets,pick)}</select>
          <input type="number" step="${noteSize()}" id="nAmt" placeholder="amount" style="max-width:130px">
          <select id="nPot" title="paid from">${potOpts(S.ui.d.pot)}</select>
          <button class="btn primary" data-act="nExp">Add</button>
          ${spent?`<span class="note" style="margin:0">${money(spent)} of expenses so far today</span>`:''}
        </div>
        <p class="note">${NIGHT_NOTE[nType]||''}</p>
        </div></div>
      <div class="step"><div class="no">3</div><div>
        <h3>Count the cash</h3><p>Count each place the money sits and type it in \u2014 then press Save count. A difference then tells you which pot it is in.</p>
        <div class="potgrid" style="margin-top:8px">${potCards}</div>
        <p class="note" id="nTotalDiff">${tdiff==null?'':totalVerdict(tdiff)}</p>
        <div class="row" style="margin-top:8px">
          <select id="nNote" data-keep="no" style="min-width:200px"><option value=""></option>${opts(S.setup.reasons||[],rc?rc.note:'')}</select>
          <button class="btn primary" data-act="saveCount">${anyCount?'Update count':'Save count'}</button>
          <span class="note" style="margin:0">Type each pot, pick a reason if it does not tie, then save.</span>
        </div></div></div>
    </div>
  </div>
  <div class="grid tiles" style="margin-bottom:16px">
    ${tile("Today's sales",money(sales))}
    ${tile('Paid out today',money(spent))}
    ${tile('Cash on hand',money(cashOnHand(d)),'your own pots')}
    ${tile("In people's hands",money(inHands(d)),floatPots().length?'floats':'no floats yet','floatc')}
  </div>
  <div class="card"><h2>Everything entered on ${esc(d)}</h2>
    ${rows.length?tbl(`<th>Type</th><th>Details</th><th>Pot</th><th class="num">In</th><th class="num">Out</th><th></th>`,
      rows.map(e=>`<tr><td>${esc(e.t)}</td><td>${esc(e.x||'')}</td>
        <td>${esc(potOf(e))}${e.t===XFER?' → '+esc(e.p2||''):''}</td>
        <td class="num">${e.in?money(e.in):''}</td><td class="num">${e.out?money(e.out):''}</td>
        <td><button class="mini" data-act="cbDel" data-row="${esc(e.id)}">Delete</button></td></tr>`).join(''))
      :`<div class="empty">Nothing entered for this day yet.</div>`}
  </div>`;
};
