import {XFER} from '../../state.js';
import {cls, esc, money} from '../../util/money.js';
import {ymd} from '../../util/dates.js';
import {cashOnHand, inHands, potBalance, pots} from '../../core/pots.js';
import {countRows} from '../../core/counts.js';
import {tbl, tile} from '../dom.js';
import {elecCard} from '../parts.js';
import {VIEWS} from '../render.js';

/* ---------------------------------------------------------- Cash & counts */
VIEWS.cash=function(){
  const rows=countRows(),list=rows.slice().reverse();
  const short=rows.filter(o=>o.diff<0).reduce((a,o)=>a+o.diff,0);
  const over=rows.filter(o=>o.diff>0).reduce((a,o)=>a+o.diff,0);
  const last=rows.length?rows[rows.length-1]:null;
  return `<div class="card"><h2>Where the money is</h2>
    <p class="sub">Your own pots are the business's cash. A float is money someone is holding for the business — it is still yours, just not in your hand.</p>
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
    <p class="note">Moving money between pots — box to bank, or handing a float to someone — is a <strong>${XFER}</strong> on the Cashbook tab. Recording it that way instead of as a difference is what keeps a count honest.</p>
  </div>
  <div class="card"><h2>Cash counts</h2><p class="sub">Count on the Tonight tab; this is the history</p>
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
  </div>`+elecCard();
};
