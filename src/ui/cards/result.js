/* The month's result, and closing it. */
import {S} from '../../state.js';
import {cls, esc, money, num, pct} from '../../util/money.js';
import {monthName, monthOf, ymd} from '../../util/dates.js';
import {result} from '../../core/pnl.js';
import {closedMonths, frozen} from '../../core/months.js';
import {tbl} from '../dom.js';
import {closedBadge} from '../parts.js';

export function resultCard(){
  const r=result();
  const line=(l,v,c,strong)=>`<tr${strong?' class="tot"':''}><td>${esc(l)}</td><td class="num ${c||''}">${money(v)}</td></tr>`;
  return `<div class="card"><h2>Result${closedBadge()}</h2>
    ${tbl(`<th>Line</th><th class="num">Amount</th>`,
      line('Sales',r.sales+r.other)+
      line('Cost of goods',-r.cogs.value)+line('Gross profit',r.gross,cls(r.gross),true)+
      line('Daily expenses & bills',-r.daily)+
      (num(r.elec)?line('Electricity used',-num(r.elec)):'')+
      line('Rent & fixed',-r.fixed)+line('Salaries',-r.salaries)+
      line('Net profit',r.net,cls(r.net),true))}
    <p class="note">Gross ${pct(r.grossPct)} · net ${pct(r.netPct)} · stock ${money(r.cogs.opening)} + ${money(r.cogs.purchases)} bought − ${money(r.cogs.closing)} left</p>
  </div>`;
}

export function closeCard(){
  const f=frozen(),r=result();
  const cd=r.cogs.date,needCount=!cd||cd<S.ui.start;
  const confirming=S.ui.d.confirmClose===monthOf(S.ui.start);
  return f
    ? `<div class="card"><div class="row">
        <div><strong>Closed ${esc(ymd(f.closedAt))}</strong>
          <p class="note" style="margin:2px 0 0">Stock counted ${esc(f.countDate||'—')}. Setup changes cannot move these figures.</p></div>
        <button class="btn ghost" style="margin-left:auto" data-act="reopen">Reopen</button></div></div>`
    : `<div class="card"><div class="row">
        ${confirming
          ? `<div><strong>Close ${esc(monthName(monthOf(S.ui.start)))}?</strong>
               <p class="note" style="margin:2px 0 0">${needCount?'There is no stock count in this month.':'Freezes the result, writes the ledger, books '+money(r.cogs.closing)+' as next month’s opening stock and rebases supplier debt.'} You can reopen it later.</p></div>
             <div style="margin-left:auto"><button class="btn primary" data-act="closeGo">Yes, close it</button>
               <button class="btn ghost" data-act="closeNo">Cancel</button></div>`
          : `<div><strong>Close ${esc(monthName(monthOf(S.ui.start)))}</strong>
               <p class="note" style="margin:2px 0 0">${needCount?'<span class="warnc">Take the stock count first.</span>':'The count is in — ready to close.'}</p></div>
             <button class="btn primary" style="margin-left:auto" data-act="closeAsk">Close the month</button>`}
      </div></div>`;
}

export function closedMonthsCard(){
  const hist=closedMonths().map(m=>S.closed[m]);
  return `<div class="card"><h2>Closed months</h2>
    ${hist.length?tbl(`<th>Month</th><th class="num">Sales</th><th class="num">Cost of goods</th><th class="num">Gross %</th><th class="num">Net</th><th class="num">Net %</th>`,
      hist.slice().reverse().map(h=>{const x=h.result||{};
        return `<tr><td><button class="mini" data-act="goMonth" data-m="${esc(h.month)}">${esc(monthName(h.month))}</button></td>
        <td class="num">${money(x.rev)}</td><td class="num">${money(x.cogs&&x.cogs.value)}</td>
        <td class="num">${pct(x.grossPct)}</td><td class="num ${cls(x.net)}">${money(x.net)}</td>
        <td class="num">${pct(x.netPct)}</td></tr>`;}).join(''))
      :`<div class="empty">Close a month and it appears here, beside every other month.</div>`}
  </div>`;
}
