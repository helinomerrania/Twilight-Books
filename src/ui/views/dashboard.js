import {S} from '../../state.js';
import {cls, esc, money, num, pct} from '../../util/money.js';
import {inPer, ymd} from '../../util/dates.js';
import {cashOnHand, floatPots, inHands, ownPots} from '../../core/pots.js';
import {result} from '../../core/pnl.js';
import {partners, payroll} from '../../core/people.js';
import {suppliers} from '../../core/suppliers.js';
import {cashFlow} from '../../core/flow.js';
import {checks} from '../../core/checks.js';
import {tbl, tile} from '../dom.js';
import {closedBadge, flowBlock, periodCard, recentCard} from '../parts.js';
import {VIEWS} from '../render.js';

/* update what the count says without rebuilding the screen around it */

/* ---------------------------------------------------------- Dashboard */
VIEWS.dashboard=function(){
  const r=result(),prt=partners(),pay=payroll(),sup=suppliers();
  const owed=sup.reduce((a,s)=>a+s.still,0),topay=pay.reduce((a,p)=>a+p.payNow,0);
  const fl=cashFlow();
  const ds=(()=>{const m={};for(const e of S.cb){if(e.t!=='Daily Sales'||!inPer(e.d))continue;
    m[ymd(e.d)]=(m[ymd(e.d)]||0)+num(e.in);}return Object.entries(m).sort((a,b)=>a[0]<b[0]?-1:1);})();
  const W=680,H=120,maxDs=ds.reduce((m,d)=>Math.max(m,d[1]),0)||1;
  const bw=ds.length?Math.min(24,(W-14)/ds.length-3):10;
  const bars=ds.map((d,i)=>{const h=Math.max(2,(d[1]/maxDs)*(H-28));
    const x=7+i*((W-14)/Math.max(ds.length,1)),y=H-18-h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="var(--accent)"></rect>`;}).join('');
  const ck=checks(),bad=ck.filter(c=>c.level!=='ok');
  return periodCard()+
  `<div class="grid tiles" style="margin-bottom:16px">
    ${tile('Revenue',money(r.rev))}
    ${tile('Cost of goods',money(r.cogs.value),r.cogs.raw<0?'nothing measurable — see the checks':'stock consumed')}
    ${tile('Gross profit',money(r.gross),pct(r.grossPct)+' margin',cls(r.gross))}
    ${tile('Net profit',money(r.net),pct(r.netPct)+' margin',cls(r.net))}
    ${tile('Cash on hand',money(cashOnHand()),ownPots().map(p=>p.name).join(' + '))}
    ${tile("In people's hands",money(inHands()),floatPots().length?floatPots().map(p=>p.name).join(' + '):'no floats','floatc')}
    ${tile('Owed to suppliers',money(owed),sup.filter(s=>s.still>0).length+' with a balance')}
    ${tile('Payroll still to pay',money(topay),'after advances')}
  </div>
  <div class="card"><h2>${bad.length?'Needs a look':'Everything checks out'}</h2>
    <p class="sub">${bad.length?bad.length+' of '+ck.length+' checks want attention':'all '+ck.length+' checks pass'}</p>
    <div class="checks">${ck.slice().sort((a,b)=>(a.level==='ok')-(b.level==='ok')).map(c=>
      `<div class="check ${c.level==='ok'?'':c.level}"><span class="dot"></span>
       <span><strong>${esc(c.label)}</strong>${c.detail?'<br><span style="color:var(--muted)">'+esc(c.detail)+'</span>':''}</span></div>`).join('')}</div>
  </div>
  ${recentCard()}
  <div class="card"><h2>Sales by day</h2><p class="sub">${ds.length} day${ds.length===1?'':'s'} recorded${ds.length?' · biggest day '+money(maxDs)+' · average '+money(ds.reduce((a,x)=>a+x[1],0)/ds.length):''}</p>
    ${ds.length?`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-width:100%" role="img" aria-label="Sales by day">
      <line x1="7" y1="${H-18}" x2="${W-7}" y2="${H-18}" stroke="var(--line)" stroke-width="1"></line>${bars}
      <text x="7" y="${H-5}" font-size="10" fill="var(--muted)" font-family="var(--body)">${esc(ds[0][0])}</text>
      <text x="${W-7}" y="${H-5}" font-size="10" fill="var(--muted)" text-anchor="end" font-family="var(--body)">${esc(ds[ds.length-1][0])}</text>
      <text x="7" y="12" font-size="10" fill="var(--muted)" font-family="var(--body)">peak ${esc(money(maxDs))}</text>
    </svg>`:`<div class="empty">No sales recorded for this month yet.</div>`}
  </div>
  <div class="card">
    <div class="cardhead"><h2>Where the money went${closedBadge()}</h2>
      <button class="mini" data-act="printAll">Print all</button></div>
    <p class="sub">Everything that left this month, by kind and by name \u2014 ${money(fl.out.reduce((a,g)=>a+g.total,0))} in all.
      <span>Tap a name for its entries.</span></p>
    ${fl.out.length?flowBlock(fl.out):`<div class="empty">Nothing paid out this month.</div>`}
    ${fl.inn.length?`<div class="blocklab" style="margin-top:20px">What came in &nbsp;\u00b7&nbsp; ${money(fl.inn.reduce((a,g)=>a+g.total,0))}</div>
      ${flowBlock(fl.inn)}`:''}
  </div>
  <div class="card"><h2>Partners${closedBadge()}</h2><p class="sub">Share of this month's profit, less what each has taken</p>
    ${tbl(`<th>Partner</th><th class="num">Share</th><th class="num">Brought forward</th><th class="num">Profit share</th><th class="num">Taken</th><th class="num">Balance</th><th>Status</th>`,
      prt.map(p=>`<tr><td>${esc(p.name)}</td><td class="num">${(p.share*100).toFixed(0)}%</td>
      <td class="num">${money(p.bf)}</td><td class="num ${cls(p.profit)}">${money(p.profit)}</td>
      <td class="num">${money(p.wd)}</td><td class="num ${cls(p.cf)}">${money(p.cf)}</td>
      <td><span class="pill ${p.cf<0?'neg':(p.cf>0?'pos':'')}">${p.cf<0?'owes the business':(p.cf>0?'to pay out':'settled')}</span></td></tr>`).join(''))}
  </div>`;
};
