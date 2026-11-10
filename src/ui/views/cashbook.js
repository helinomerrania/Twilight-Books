import {IN_TYPES, S, XFER} from '../../state.js';
import {esc, money, noteSize, num} from '../../util/money.js';
import {byDate, monthName, monthOf, today, ymd} from '../../util/dates.js';
import {cashOnHand, potOf} from '../../core/pots.js';
import {typeDetails, typeNames} from '../../core/types.js';
import {opts, potOpts, tbl, tile} from '../dom.js';
import {VIEWS} from '../render.js';

/* ---------------------------------------------------------- Cashbook */
VIEWS.cashbook=function(){
  const types=typeNames(),sel=S.ui.d.cbType||types[0],isXfer=sel===XFER,isIn=IN_TYPES.includes(sel);
  const all=S.ui.d.cbAll;
  const rows=byDate(S.cb).filter(r=>all||monthOf(r.d)===monthOf(S.ui.start));
  const list=rows.slice().reverse();
  const totIn=S.cb.filter(e=>e.t!==XFER).reduce((a,r)=>a+num(r.in),0);
  const totOut=S.cb.filter(e=>e.t!==XFER).reduce((a,r)=>a+num(r.out),0);
  return `<div class="card"><h2>New entry</h2>
    <p class="sub">${isXfer?'A transfer moves money between your pots. It never touches profit.'
      :(isIn?'This type brings money in.':'This type takes money out.')}</p>
    <div class="entry">
      <div><label for="cDate">Date</label><input type="date" id="cDate" value="${esc(today())}"></div>
      <div><label for="cType">Type</label><select id="cType" data-act="cbType">${opts(types,sel)}</select></div>
      ${isXfer
        ? `<div><label for="cFrom">From</label><select id="cFrom">${potOpts(S.ui.d.pot)}</select></div>
           <div><label for="cTo">To</label><select id="cTo">${potOpts(null)}</select></div>`
        : `<div><label for="cDetail">Details</label><select id="cDetail" data-keep="no">${opts(typeDetails(sel))}</select></div>
           <div><label for="cPot">${isIn?'Into':'Out of'}</label><select id="cPot">${potOpts(S.ui.d.pot)}</select></div>`}
      <div><label for="cAmt">Amount</label><input type="number" step="${noteSize()}" id="cAmt" placeholder="0"></div>
      <div><button class="btn primary" data-act="cbAdd">Add entry</button></div>
    </div>
  </div>
  <div class="grid tiles" style="margin-bottom:16px">
    ${tile('Money in',money(totIn),'all time')}${tile('Money out',money(totOut),'all time')}
    ${tile('Cash on hand',money(cashOnHand()))}${tile('Entries',String(S.cb.length))}
  </div>
  <div class="card"><div class="row" style="margin-bottom:10px">
      <h2>${all?'All entries':esc(monthName(monthOf(S.ui.start)))}</h2>
      <button class="btn ghost" style="margin-left:auto" data-act="cbAll">${all?'This month only':'Show every entry'}</button></div>
    ${list.length?tbl(`<th>Date</th><th>Type</th><th>Details</th><th>Pot</th><th class="num">In</th><th class="num">Out</th><th></th>`,
      list.map(r=>`<tr>
        <td><input type="date" value="${esc(ymd(r.d))}" data-row="${esc(r.id)}" data-k="d"></td>
        <td><select data-row="${esc(r.id)}" data-k="t">${opts(types,r.t)}</select></td>
        <td>${r.t===XFER?'<span style="color:var(--muted)">transfer</span>'
          :`<select data-row="${esc(r.id)}" data-k="x">${opts(typeDetails(r.t).includes(r.x)?typeDetails(r.t):[r.x].concat(typeDetails(r.t)),r.x)}</select>`}</td>
        <td><select data-row="${esc(r.id)}" data-k="p">${potOpts(potOf(r))}</select>${
          r.t===XFER?` → <select data-row="${esc(r.id)}" data-k="p2">${potOpts(r.p2)}</select>`:''}</td>
        <td class="num">${r.t===XFER?'':`<input type="number" step="${noteSize()}" value="${r.in?num(r.in):''}" data-row="${esc(r.id)}" data-k="in">`}</td>
        <td class="num"><input type="number" step="${noteSize()}" value="${r.out?num(r.out):''}" data-row="${esc(r.id)}" data-k="out"></td>
        <td><button class="mini" data-act="cbDel" data-row="${esc(r.id)}">Delete</button></td></tr>`).join(''))
      :`<div class="empty">Nothing recorded for ${esc(monthName(monthOf(S.ui.start)))}.</div>`}
  </div>`;
};
