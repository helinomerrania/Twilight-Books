/* Stock: what arrived, what is left, and what each supplier is owed for it. */
import {S} from '../../state.js';
import {esc, money, mround, noteSize, num, qty} from '../../util/money.js';
import {byDate, monthOf, today, ymd} from '../../util/dates.js';
import {blockTotals, booked, catLetter, cogs, countDates, countForPeriod,
        countsFor, hasCounts, isCounted} from '../../core/stock.js';
import {supAll} from '../../core/suppliers.js';
import {share} from '../../core/flow.js';
import {opts, tbl, tile} from '../dom.js';
import {closedBadge, invHead, invRow, supTable} from '../parts.js';

function countDate(){return S.ui.d.inv||countForPeriod()||today();}
function locked(d){return !!(S.closed[monthOf(d)]&&S.closed[monthOf(d)].countDate===d);}

export function countPicker(){
  const dates=countDates(),date=countDate(),ro=locked(date);
  return `<div class="card"><div class="row">
      <div><span class="flab">Count date</span>
        <select id="invPick" data-act="invPick">${opts(dates.includes(date)?dates:[date].concat(dates),date)}</select>
        ${ro?'<span class="badge">Closed</span>'
            :`<button class="mini" data-act="invDel" data-d="${esc(date)}" style="margin-left:6px">Delete this count</button>`}</div>
      <div><span class="flab">Start a new count</span>
        <input type="date" id="invNew" value="${esc(today())}"> <button class="btn ghost" data-act="invAdd">Open count</button></div>
    </div><p class="note">${ro
      ? 'This count belongs to a closed month, so it is locked along with the prices it was valued at.'
      : (isCounted(date)
         ? 'Weigh the bucket and the tare comes off. Sealed tobacco converts from cartons and blocks to kilos. Everything else is whole packages plus loose pieces.'
         : '<strong class="warnc">This count is empty.</strong> Nothing has been typed into it, so it is ignored and the stock is still valued from '
           + esc(String(countForPeriod()||'the last real count')) + '. Fill it in, or delete it.')}</p></div>`;
}

export function stockFigures(){
  const date=countDate(),c=cogs();
  return `<div class="grid tiles" style="margin-bottom:16px">
    ${tile('Closing stock',money(booked(date)),hasCounts(date)?'counted':'carried in')}
    ${tile('Opening stock',money(c.opening),'previous count')}
    ${tile('Bought this month',money(c.purchases),'supplier receipts')}
    ${tile('Cost of goods sold',money(c.value),'opening + bought − closing')}
  </div>`;
}

export function stockCount(){
  const date=countDate(),ro=locked(date);
  const counts=countsFor(date),blocks=blockTotals(date);
  const body=(S.setup.categories||[]).map(cat=>{
    const L=catLetter(cat),items=(S.setup.stockItems||[]).filter(i=>catLetter(i.category)===L);
    if(!items.length)return '';
    const b=blocks[L]||{qty:0,value:0},span=L==='A'?5:(L==='B'?5:(L==='E'?4:6));
    return `<div class="blocklab">${esc(cat)}</div>`+
      tbl(invHead(L),items.map(i=>invRow(i,counts,date,ro)).join(''),
        `<tr class="tot"><td>Total</td><td class="num" colspan="${span}">${(L==='A'||L==='B')?qty(b.qty)+' kg':''}</td><td class="num">${money(mround(b.value))}</td></tr>`);
  }).join('');
  return `<div class="card"><h2>Count for ${esc(date)}</h2>
    <p class="sub">Quantities only. Prices and pack sizes come from Setup.</p>${body}</div>`;
}

export function receiptForm(){
  const pu=byDate(S.pu).slice().reverse();
  return `<div class="card"><h2>New receipt</h2><p class="sub">One line per supplier receipt — the total is all that is needed.</p>
    <div class="entry">
      <div><label for="pDate">Date</label><input type="date" id="pDate" value="${esc(today())}"></div>
      <div><label for="pSup">Supplier</label><select id="pSup">${opts(S.setup.suppliers||[])}</select></div>
      <div><label for="pNo">Receipt no.</label><input id="pNo" placeholder="optional"></div>
      <div><label for="pWhat">For</label><input id="pWhat" value="Several items"></div>
      <div><label for="pAmt">Total</label><input type="number" step="${noteSize()}" id="pAmt" placeholder="0"></div>
      <div><label for="pTerms">Terms</label><select id="pTerms"><option>Credit</option><option>Cash</option></select></div>
      <div><button class="btn primary" data-act="puAdd">Add</button></div>
    </div>
    ${pu.length?tbl(`<th>Date</th><th>Supplier</th><th>Receipt</th><th>For</th><th class="num">Total</th><th>Terms</th><th></th>`,
      pu.slice(0,40).map(p=>`<tr>
        <td><input type="date" value="${esc(ymd(p.d))}" data-pu="${esc(p.id)}" data-k="d"></td>
        <td><select data-pu="${esc(p.id)}" data-k="s">${opts((S.setup.suppliers||[]).includes(p.s)?S.setup.suppliers:[p.s].concat(S.setup.suppliers||[]),p.s)}</select></td>
        <td><input value="${esc(p.no||'')}" data-pu="${esc(p.id)}" data-k="no"></td>
        <td><input value="${esc(p.w||'')}" data-pu="${esc(p.id)}" data-k="w"></td>
        <td class="num"><input type="number" step="${noteSize()}" value="${num(p.amt)}" data-pu="${esc(p.id)}" data-k="amt"></td>
        <td><select data-pu="${esc(p.id)}" data-k="terms">${opts(['Credit','Cash'],p.terms)}</select></td>
        <td><button class="mini" data-act="puDel" data-pu="${esc(p.id)}">Delete</button></td></tr>`).join(''))
      :`<div class="empty">No receipts recorded.</div>`}
    ${pu.length>40?'<p class="note">Showing the 40 most recent of '+pu.length+'.</p>':''}
  </div>`;
}

export function supplierAccounts(){
  return `<div class="card">
    <div class="cardhead"><h2>Supplier accounts${closedBadge()}</h2>
      <button class="mini" data-act="printSupAll">Print all</button></div>
    <p class="sub">What each supplier was owed coming into the month, what arrived, what was paid.
      <span>Tap a name for the account.</span></p>
    ${(()=>{const all=supAll();if(!all.length)return '<div class="empty">No supplier movement this month.</div>';
      const owedAll=all.reduce((a,x)=>a+Math.max(x.closing,0),0);
      return all.map(st=>{const open=S.ui.drill==='sup:'+st.name;
        return `<button class="barbtn" data-act="drill" data-x="sup:${esc(st.name)}" aria-expanded="${open}">
          <span>${esc(st.name)}</span>
          <span class="track"><span class="fill" style="width:${st.closing>0?share(st.closing,owedAll):0}%"></span></span>
          <span class="val">${money(st.closing)} <span class="caret">${open?'▾':'›'}</span></span>
        </button>${open?supTable(st):''}`;}).join('');})()}
    <p class="note">A debt list, not an expense — the goods are already in the cost of goods, so paying a supplier does not change profit.
      Debts were rebased as at ${esc(S.debt.asAt||'—')}; only receipts and payments after that date count.</p>
  </div>`;
}

export function stockHistory(){
  const dates=countDates();
  return `<div class="card"><h2>Count history</h2>
    ${dates.length?tbl(`<th>Count date</th><th class="num">Closing value</th><th>Source</th>`,
      dates.slice().reverse().map(d=>`<tr><td>${esc(d)}</td><td class="num">${money(booked(d))}</td>
        <td style="color:var(--muted);font-size:12px">${hasCounts(d)?'counted item by item':'carried in from the workbook'}</td></tr>`).join(''))
      :`<div class="empty">No counts yet.</div>`}
  </div>`;
}
