/* The record: every entry, every count, and everything that has been changed.
   This is where you come when something needs correcting rather than entering. */
import {IN_TYPES, S, XFER} from '../../state.js';
import {cls, esc, money, noteSize, num} from '../../util/money.js';
import {byDate, monthName, monthOf, today, ymd} from '../../util/dates.js';
import {cashOnHand, inHands, potBalance, potOf, pots} from '../../core/pots.js';
import {countRows} from '../../core/counts.js';
import {typeDetails, typeNames} from '../../core/types.js';
import {opts, potOpts, tbl, tile} from '../dom.js';

export function entryForm(){
  const types=typeNames(),sel=S.ui.d.cbType||types[0],isXfer=sel===XFER,isIn=IN_TYPES.includes(sel);
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
  </div>`;
}

export function entryList(){
  const types=typeNames(),all=S.ui.d.cbAll;
  const rows=byDate(S.cb).filter(r=>all||monthOf(r.d)===monthOf(S.ui.start));
  const list=rows.slice().reverse();
  return `<div class="card"><div class="row" style="margin-bottom:10px">
      <h2>${all?'All entries':esc(monthName(monthOf(S.ui.start)))}</h2>
      <span class="badge">${list.length} entr${list.length===1?'y':'ies'}</span>
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
}

export function whereMoneyIs(){
  return `<div class="card"><h2>Where the money is</h2>
    <p class="sub">Your own pots are the business's cash. A float is money someone is holding for the business — still yours, just not in your hand.</p>
    <div class="potgrid">${pots().map(p=>{const b=potBalance(p.name);
      return `<div class="pot ${p.kind==='float'?'isfloat':''}">
        <div class="nm">${esc(p.name)}${p.kind==='float'?' <span class="pill floatc">float</span>':''}</div>
        <div class="bal ${cls(b)}">${money(b)}</div>
        <div class="sub">${p.kind==='float'?'held by this person':'your cash'}</div></div>`;}).join('')}</div>
    <div class="grid tiles" style="margin-top:12px">
      ${tile('Cash on hand',money(cashOnHand()),'own pots only')}
      ${tile("In people's hands",money(inHands()),'floats','floatc')}
      ${tile('Total',money(cashOnHand()+inHands()),'everything the books say exists')}
    </div>
    <p class="note">Moving money between pots — box to bank, or handing a float to someone — is a <strong>${XFER}</strong> entry above.
      Recording it that way instead of as a difference is what keeps a count honest.</p>
  </div>`;
}

export function countHistory(){
  const rows=countRows(),list=rows.slice().reverse();
  const short=rows.filter(o=>o.diff<0).reduce((a,o)=>a+o.diff,0);
  const over=rows.filter(o=>o.diff>0).reduce((a,o)=>a+o.diff,0);
  const last=rows.length?rows[rows.length-1]:null;
  return `<div class="card"><h2>Cash counts</h2><p class="sub">Counting is done on Tonight; this is the history.</p>
    <div class="grid tiles" style="margin-bottom:12px">
      ${tile('Times counted',String(rows.length))}
      ${tile('Total short',money(short),'all counts',short?'neg':'')}
      ${tile('Total over',money(over))}
      ${tile('Last difference',last?money(last.diff):'—',last?('counted '+ymd(last.r.d)):'',last&&last.diff?cls(last.diff):'')}
    </div>
    ${list.length?tbl(`<th>Date</th><th class="num">Books say</th><th class="num">Counted</th><th class="num">Out by</th><th>Where</th><th>Reason</th><th></th>`,
      list.map(o=>`<tr><td>${esc(ymd(o.r.d))}</td><td class="num">${money(o.expected)}</td>
        <td class="num">${money(o.counted)}</td>
        <td class="num ${o.diff?cls(o.diff)||'warnc':''}">${o.diff?money(o.diff):'—'}</td>
        <td style="font-size:12px;color:var(--muted)">${o.split
          ? o.perPot.filter(p=>p.counted!=null&&p.counted-p.expected!==0).map(p=>esc(p.name)+' '+money(p.counted-p.expected)).join(', ')||'all tie'
          : 'one total'}</td>
        <td>${esc(o.r.note||'')}</td>
        <td><button class="mini" data-act="rcDel" data-rc="${esc(o.r.id)}">Delete</button></td></tr>`).join(''))
      :`<div class="empty">No counts yet.</div>`}
  </div>`;
}
