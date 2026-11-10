import {S} from '../../state.js';
import {cls, esc, money, num, pct} from '../../util/money.js';
import {monthName, monthOf, ymd} from '../../util/dates.js';
import {closedMonths, frozen} from '../../core/months.js';
import {result} from '../../core/pnl.js';
import {partners, payroll} from '../../core/people.js';
import {tbl} from '../dom.js';
import {closedBadge, periodCard, settleCard} from '../parts.js';
import {VIEWS} from '../render.js';

/* ---------------------------------------------------------- Settlement */
VIEWS.settlement=function(){
  const f=frozen(),r=result(),pay=payroll(),prt=partners();
  const T=(a,k)=>a.reduce((x,y)=>x+num(y[k]),0);
  const line=(l,v,c,strong)=>`<tr${strong?' class="tot"':''}><td>${esc(l)}</td><td class="num ${c||''}">${money(v)}</td></tr>`;
  const months=closedMonths(),hist=months.map(m=>S.closed[m]);
  const cd=r.cogs.date,needCount=!cd||cd<S.ui.start;
  const confirming=S.ui.d.confirmClose===monthOf(S.ui.start);

  const result_=`<div class="card"><h2>Result${closedBadge()}</h2>
    ${tbl(`<th>Line</th><th class="num">Amount</th>`,
      line('Sales',r.sales+r.other)+
      line('Cost of goods',-r.cogs.value)+line('Gross profit',r.gross,cls(r.gross),true)+
      line('Daily expenses & bills',-r.daily)+
      (num(r.elec)?line('Electricity used',-num(r.elec)):'')+
      line('Rent & fixed',-r.fixed)+line('Salaries',-r.salaries)+
      line('Net profit',r.net,cls(r.net),true))}
    <p class="note">Gross ${pct(r.grossPct)} \u00b7 net ${pct(r.netPct)} \u00b7 stock ${money(r.cogs.opening)} + ${money(r.cogs.purchases)} bought \u2212 ${money(r.cogs.closing)} left</p>
  </div>`;

  /* an open month is for doing; a closed one is the record, so it shows the detail instead */
  const record=!f?'':`<div class="card"><h2>Staff payroll</h2>
    ${tbl(`<th>Staff</th><th class="num">Gross</th><th class="num">Advances</th><th class="num">Paid</th><th class="num">Carried over</th>`,
      pay.map(p=>`<tr><td>${esc(p.name)}</td><td class="num">${money(p.gross)}</td>
        <td class="num">${money(p.adv)}</td><td class="num">${money(p.paid)}</td>
        <td class="num">${money(p.carry)}</td></tr>`).join(''),
      `<tr class="tot"><td>Total</td><td class="num">${money(T(pay,'gross'))}</td><td class="num">${money(T(pay,'adv'))}</td>
       <td class="num">${money(T(pay,'paid'))}</td><td class="num">${money(T(pay,'carry'))}</td></tr>`)}
  </div>
  <div class="card"><h2>Partners</h2>
    ${tbl(`<th>Partner</th><th class="num">Brought forward</th><th class="num">Share</th><th class="num">Taken</th><th class="num">Paid out</th><th class="num">Carried forward</th>`,
      prt.map(p=>`<tr><td>${esc(p.name)}</td><td class="num">${money(p.bf)}</td>
        <td class="num ${cls(p.profit)}">${money(p.profit)}</td><td class="num">${money(p.wd)}</td>
        <td class="num">${money(p.paid)}</td><td class="num ${cls(p.cf)}">${money(p.cf)}</td></tr>`).join(''))}
  </div>`;

  const closing=f
    ? `<div class="card"><div class="row">
        <div><strong>Closed ${esc(ymd(f.closedAt))}</strong>
          <p class="note" style="margin:2px 0 0">Stock counted ${esc(f.countDate||'\u2014')}. Setup changes cannot move these figures.</p></div>
        <button class="btn ghost" style="margin-left:auto" data-act="reopen">Reopen</button></div></div>`
    : `<div class="card"><div class="row">
        ${confirming
          ? `<div><strong>Close ${esc(monthName(monthOf(S.ui.start)))}?</strong>
               <p class="note" style="margin:2px 0 0">${needCount?'There is no stock count in this month.':'Freezes the result, writes the ledger, books '+money(r.cogs.closing)+' as next month\u2019s opening stock and rebases supplier debt.'} You can reopen it later.</p></div>
             <div style="margin-left:auto"><button class="btn primary" data-act="closeGo">Yes, close it</button>
               <button class="btn ghost" data-act="closeNo">Cancel</button></div>`
          : `<div><strong>Close ${esc(monthName(monthOf(S.ui.start)))}</strong>
               <p class="note" style="margin:2px 0 0">${needCount?'<span class="warnc">Take the stock count first.</span>':'The count is in \u2014 ready to close.'}</p></div>
             <button class="btn primary" style="margin-left:auto" data-act="closeAsk">Close the month</button>`}
      </div></div>`;

  const history=`<div class="card"><h2>Closed months</h2>
    ${hist.length?tbl(`<th>Month</th><th class="num">Sales</th><th class="num">Cost of goods</th><th class="num">Gross %</th><th class="num">Net</th><th class="num">Net %</th>`,
      hist.slice().reverse().map(h=>{const x=h.result||{};
        return `<tr><td><button class="mini" data-act="goMonth" data-m="${esc(h.month)}">${esc(monthName(h.month))}</button></td>
        <td class="num">${money(x.rev)}</td><td class="num">${money(x.cogs&&x.cogs.value)}</td>
        <td class="num">${pct(x.grossPct)}</td><td class="num ${cls(x.net)}">${money(x.net)}</td>
        <td class="num">${pct(x.netPct)}</td></tr>`;}).join(''))
      :`<div class="empty">Close a month and it appears here, beside every other month.</div>`}
  </div>`;

  return periodCard()+(f?'':settleCard())+result_+record+closing+history;
};
