import {APP_VERSION, S} from '../../state.js';
import {esc, noteSize, num} from '../../util/money.js';
import {pots} from '../../core/pots.js';
import {typeDetails} from '../../core/types.js';
import {BK, bkText} from '../../store/helper.js';
import {tbl} from '../dom.js';
import {editor} from '../parts.js';
import {VIEWS} from '../render.js';

VIEWS.setup=function(){
  const b=S.setup.business||{},cv=S.setup.conversions||{},cats=(S.setup.categories||[]);
  const shares=(S.setup.partners||[]).reduce((a,p)=>a+num(p.share),0);
  return `<div class="banner">Changing anything here affects open months only. Months you have closed keep the roster, prices and shares they were closed with.</div>
  <div class="card"><h2>Business</h2>
    <div class="entry">
      <div><label>Name</label><input value="${esc(b.name||'')}" data-biz="name"></div>
      <div><label>Currency</label><input value="${esc(b.currency||'')}" data-biz="currency"></div>
      <div><label>Owner / manager</label><input value="${esc(b.owner||'')}" data-biz="owner"></div>
      <div><label>Smallest banknote</label><input type="number" step="50" value="${num(b.rounding)||250}" data-biz="rounding"></div>
    </div><p class="note">Money is rounded to the nearest ${num(b.rounding)||250} everywhere, because no smaller note exists.</p></div>
  <div class="sectionhead"><h3>People and money</h3><span>Who is paid, who is owed, and where the cash sits</span></div>
  ${editor('Cash pots','Where the money physically sits. Mark a pot as a <strong>float</strong> when a person is holding the cash — it stays yours, but out of your hand, and it never touches payroll.',
    pots(),[{label:'Pot',k:'name'},{label:'Kind',k:'kind',opts:()=>['own','float']}],'addPot','delPot','pots')}
  ${editor('Partners','Shares must total 100% — currently '+(shares*100).toFixed(0)+'%.',
    S.setup.partners||[],[{label:'Partner',k:'name'},{label:'Share (0.5 = 50%)',k:'share',num:true}],'addPartner','delPartner','partners')}
  ${editor('Staff & salaries','The gross salary is charged to the month in full, paid or not.',
    S.setup.staff||[],[{label:'Staff',k:'name'},{label:'Gross monthly salary',k:'salary',num:true},{label:'Advance carried in',k:'carryIn',num:true}],'addStaff','delStaff','staff')}
  ${editor('Fixed monthly expenses','Charged to every open month in full.',S.setup.fixedExpenses||[],
    [{label:'Expense',k:'name'},{label:'Monthly amount',k:'amount',num:true}],'addFixed','delFixed','fixedExpenses')}
  ${editor('Suppliers','Used by receipts, payments and the debt ledger.',
    (S.setup.suppliers||[]).map(s=>({name:s})),[{label:'Supplier',k:'name'}],'addSupplier','delSupplier','suppliers')}
  ${editor('Daily expense categories','What you can tap on the Tonight tab. The first ten show as buttons.',
    (typeDetails('Daily Expense')||[]).map(s=>({name:s})),[{label:'Category',k:'name'}],'addCat','delCat','expcats')}
  <div class="sectionhead"><h3>Stock</h3><span>What you count, how it converts, what it is worth</span></div>
  ${editor('Stock items','Category, unit, price, supplier and pack size. A price change moves open months only.',
    S.setup.stockItems||[],[{label:'Item',k:'name'},{label:'Category',k:'category',opts:()=>cats},
      {label:'Unit',k:'unit'},{label:'Price',k:'price',num:true},
      {label:'Supplier',k:'supplier',opts:()=>S.setup.suppliers||[]},{label:'Pieces per unit',k:'per',num:true}],
    'addItem','delItem','stockItems')}
  ${editor('Bucket tare weights','Taken off when weighed tobacco is counted.',S.setup.tare||[],
    [{label:'Bucket',k:'name'},{label:'Empty weight (g)',k:'g',num:true}],'addTare','delTare','tare')}
  <div class="card"><h2>Unit conversions</h2><p class="sub">How sealed tobacco and ice cream convert</p>
    <div class="entry">
      <div><label>Blocks per carton</label><input type="number" value="${num(cv.blocksPerCarton)}" data-conv="blocksPerCarton"></div>
      <div><label>Packs per block</label><input type="number" value="${num(cv.packsPerBlock)}" data-conv="packsPerBlock"></div>
      <div><label>Grams per pack</label><input type="number" value="${num(cv.gramsPerPack)}" data-conv="gramsPerPack"></div>
      <div><label>Grams per kilo</label><input type="number" value="${num(cv.gramsPerKilo)}" data-conv="gramsPerKilo"></div>
      <div><label>Buckets per ice cream carton</label><input type="number" value="${num(cv.bucketsPerCarton)}" data-conv="bucketsPerCarton"></div>
    </div>
    <p class="note">1 carton = ${num(cv.blocksPerCarton)} blocks = ${num(cv.blocksPerCarton)*num(cv.packsPerBlock)} packs = ${(num(cv.blocksPerCarton)*num(cv.packsPerBlock)*num(cv.gramsPerPack)/(num(cv.gramsPerKilo)||1000))||0} kg.</p></div>
  <div class="sectionhead"><h3>Rarely changed</h3><span>Set once, then left alone</span></div>
  ${editor('Cash difference reasons','The list on the Tonight tab.',(S.setup.reasons||[]).map(s=>({name:s})),
    [{label:'Reason',k:'name'}],'addReason','delReason','reasons')}
  <div class="sectionhead"><h3>This app</h3><span>Where the books are kept, and the version you are running</span></div>
  <div class="card"><h2>This copy of the books</h2>
    <p class="sub">Everything is stored in this browser, on this computer. Nothing goes anywhere else.</p>
    <p class="note" id="bkStatus" style="margin:0 0 10px">${esc(bkText())}</p>
    <div class="row">
      ${BK.mode==='helper' ? ''
        : (BK.state==='ready'
        ? `<button class="btn ghost" data-act="bkStop">Stop backing up</button>`
        : (BK.state==='needs'
          ? `<button class="btn primary" data-act="bkReconnect">Reconnect ${esc(BK.name)}</button>`
          : (BK.state==='unsupported'?''
            : `<button class="btn primary" data-act="bkChoose">Choose a backup folder</button>`)))}
      <button class="btn ghost" data-act="backup">Save a backup file</button>
      <button class="btn ghost" data-act="restoreAsk">Load a backup file</button>
      <input type="file" id="restoreFile" accept="application/json,.json" style="display:none">
    </div>
    <p class="note">${BK.mode==='helper'
      ? 'Every change is written into that folder, plus a copy named for today. Put the folder inside OneDrive and the copies leave this computer by themselves.'
      : 'Pick a folder that syncs off this computer — OneDrive or Google Drive — and the books are copied there after every change, plus one dated copy a day. Windows will ask permission once each time you open this page.'}</p>
    <p class="note"><strong>Use one copy only.</strong> If you also enter things in the online version, the two disagree and there is no way to merge them.</p>
  </div>
  <div class="card"><h2>Version</h2>
    <p class="sub">This copy is <strong>${esc(APP_VERSION)}</strong>.</p>
    ${BK.mode==='helper'
      ? `<p class="note">New versions come from GitHub. Twilight looks every time you start it, and you can look now. Your books are copied aside before anything is applied, so an update can always be undone.</p>
         <p><button class="btn ghost" data-act="checkUpdate">Check for updates</button>
         <span id="updmsg" class="note"></span></p>`
      : `<p class="note">Updating needs the Twilight window running on the lounge computer.</p>`}
  </div>
  <div class="card"><h2>Supplier debt brought forward</h2>
    <p class="sub">Closing a month sets these for you. Type them only when starting from scratch.</p>
    <div class="entry"><div><label>Rebased as at</label><input type="date" value="${esc(S.debt.asAt||'')}" data-debt="asAt"></div></div>
    ${tbl(`<th>Supplier</th><th class="num">Brought forward</th>`,
      (S.setup.suppliers||[]).map(s=>`<tr><td>${esc(s)}</td>
        <td class="num"><input type="number" step="${noteSize()}" value="${num((S.debt.brought||{})[s])}" data-debtsup="${esc(s)}"></td></tr>`).join(''))}
  </div>`;
};
