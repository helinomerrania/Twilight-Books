/* Staff and partners. One partners table, not two: it used to appear on the
   dashboard and again on settlement, with different columns each time. */
import {cls, esc, money, num} from '../../util/money.js';
import {partners, payroll} from '../../core/people.js';
import {tbl} from '../dom.js';
import {closedBadge} from '../parts.js';

const T=(a,k)=>a.reduce((x,y)=>x+num(y[k]),0);

export function payrollCard(){
  const pay=payroll();
  return `<div class="card"><h2>Staff payroll${closedBadge()}</h2>
    <p class="sub">The salary is charged to the month in full. Advances come off it; what is left is handed over.</p>
    ${tbl(`<th>Staff</th><th class="num">Salary</th><th class="num">Advances</th><th class="num">Paid</th><th class="num">Still to pay</th><th class="num">Carried over</th>`,
      pay.map(p=>`<tr><td>${esc(p.name)}</td><td class="num">${money(p.gross)}</td>
        <td class="num">${money(p.adv)}</td><td class="num">${money(p.paid)}</td>
        <td class="num ${p.payNow?'':'pos'}">${money(p.payNow)}</td>
        <td class="num ${p.carry?'neg':''}">${money(p.carry)}</td></tr>`).join(''),
      `<tr class="tot"><td>Total</td><td class="num">${money(T(pay,'gross'))}</td><td class="num">${money(T(pay,'adv'))}</td>
       <td class="num">${money(T(pay,'paid'))}</td><td class="num">${money(T(pay,'payNow'))}</td>
       <td class="num">${money(T(pay,'carry'))}</td></tr>`)}
  </div>`;
}

export function partnersCard(){
  const prt=partners();
  return `<div class="card"><h2>Partners${closedBadge()}</h2>
    <p class="sub">Share of this month's profit, less what each has already taken.</p>
    ${tbl(`<th>Partner</th><th class="num">Share</th><th class="num">Brought forward</th><th class="num">Profit share</th><th class="num">Taken</th><th class="num">Paid out</th><th class="num">Balance</th><th>Status</th>`,
      prt.map(p=>`<tr><td>${esc(p.name)}</td><td class="num">${(p.share*100).toFixed(0)}%</td>
      <td class="num">${money(p.bf)}</td><td class="num ${cls(p.profit)}">${money(p.profit)}</td>
      <td class="num">${money(p.wd)}</td><td class="num">${money(p.paid)}</td>
      <td class="num ${cls(p.cf)}">${money(p.cf)}</td>
      <td><span class="pill ${p.cf<0?'neg':(p.cf>0?'pos':'')}">${p.cf<0?'owes the business':(p.cf>0?'to pay out':'settled')}</span></td></tr>`).join(''))}
  </div>`;
}
