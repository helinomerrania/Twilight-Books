import {EPAY, IN_TYPES, S, XFER} from './state.js';
import {esc, money, num} from './util/money.js';
import {monthName, monthOf, rid, shiftMonth, today, ymd} from './util/dates.js';
import {defaultPot, potBalance, potOf, pots} from './core/pots.js';
import {typeDetails} from './core/types.js';
import {countForPeriod, hasCounts} from './core/stock.js';
import {elecCalc, elecDetails, elecFactors, elecOwedFor, elecRows} from './core/electricity.js';
import {backupNow, restoreFrom, saveCb, saveDebt, saveElec, saveInv, saveSetup, saveYr, writeLocal} from './store/local.js';
import {undoLog} from './store/log.js';
import {bkChoose, bkReconnect, bkStop, gateAllow, gateOther, gateSkip} from './store/helper.js';
import {checkUpdate} from './store/update.js';
import {$, byId, flash, note, pickAll, redraw, wantsAll} from './ui/dom.js';
import {printSlip, slipAll, slipKind, slipLog, slipName, slipSup, slipSupAll} from './ui/print.js';
import {render} from './ui/render.js';
import {closeMonth, reopen, saveCounts, setMonth} from './ui/actions.js';

document.addEventListener('click',function(ev){
  const t=ev.target.closest('[data-tab]');
  if(t){S.ui.tab=t.dataset.tab;
    document.querySelectorAll('section.tab').forEach(s=>s.hidden=(s.id!=='tab-'+S.ui.tab));render();return;}
  const el=ev.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;
  const go=()=>{saveSetup();render();};
  if(a==='checkUpdate'){checkUpdate(el);return;}
  if(a==='goTab'){S.ui.tab=el.dataset.to;render();window.scrollTo(0,0);return;}
  if(a==='undo'){undoLog(el.dataset.i);}
  else if(a==='logAll'){S.ui.logAll=!S.ui.logAll;render();}
  else if(a==='printLog'){printSlip(slipLog());}
  else if(a==='printAll'){printSlip(slipAll());}
  else if(a==='printSup'){printSlip(slipSup(el.dataset.x));}
  else if(a==='printSupAll'){printSlip(slipSupAll());}
  else if(a==='printKind'){printSlip(slipKind(el.dataset.k));}
  else if(a==='printName'){printSlip(slipName(el.dataset.x));}
  else if(a==='drill'){S.ui.drill=(S.ui.drill===el.dataset.x)?null:el.dataset.x;render();}
  else if(a==='prevM'){setMonth(shiftMonth(monthOf(S.ui.start),-1));render();}
  else if(a==='nextM'){setMonth(shiftMonth(monthOf(S.ui.start),1));render();}
  else if(a==='goMonth'){S.ui.tab='settlement';setMonth(el.dataset.m);
    document.querySelectorAll('section.tab').forEach(s=>s.hidden=(s.id!=='tab-settlement'));render();}
  else if(a==='pickCat'){S.ui.d.cat=el.dataset.cat;render();}
  else if(a==='pickType'){S.ui.d.nType=el.dataset.t;S.ui.d.cat=null;render();}
  else if(a==='nSales'){
    const d=S.ui.d.night||today(),raw=$('#nSales').value,v=num(raw);
    if(raw===''||raw==null){flash('Type the day’s sales first — 0 is fine if you were closed.');return;}
    const ex=S.cb.filter(e=>ymd(e.d)===d&&e.t==='Daily Sales');
    if(ex.length>1){flash('There were '+ex.length+' sales lines for '+d+
      '. They have been left alone — tidy them on the Cashbook so nothing is lost.');return;}
    if(ex.length){ex[0].in=v;ex[0].p=ex[0].p||defaultPot();}
    else S.cb.push({id:rid(),d,t:'Daily Sales',x:(typeDetails('Daily Sales')[0]||'Total sales of the day'),
                    in:v,out:0,p:defaultPot()});
    saveCb([d]);render();}
  else if(a==='nExp'){
    const d=S.ui.d.night||today(),v=num($('#nAmt').value),cat=$('#nCat').value,
          p=$('#nPot').value,ty=S.ui.d.nType||'Daily Expense';
    if(!v){flash('Type an amount.');return;}
    if(!cat){flash('Pick who or what this is for.');return;}
    S.ui.d.pot=p;
    S.cb.push({id:rid(),d,t:ty,x:cat,in:0,out:v,p});
    saveCb([d]);$('#nAmt').value='';render();}
  else if(a==='saveCount'){
    if(!S.db){flash('Not connected to the shared data, so nothing can be saved. Reload the page.');return;}
    const d=S.ui.d.night||today(),vals={};
    document.querySelectorAll('#tab-tonight input[data-pot]').forEach(el=>{vals[el.dataset.pot]=el.value;});
    const noteEl=$('#nNote'),res=saveCounts(d,vals,noteEl?noteEl.value:'');
    el.disabled=true;note('Saving the count\u2026');
    res.p.then(ok=>{render();
      if(ok)flash(res.any?('Count saved for '+d+' \u2014 '+res.n+' pot'+(res.n===1?'':'s')+'.')
                         :('Count cleared for '+d+'.'));});}
  else if(a==='cbAdd'){
    const d=$('#cDate').value,ty=$('#cType').value,v=num($('#cAmt').value);
    if(!d||!v){flash('A date and an amount are needed.');return;}
    if(ty===XFER){const from=$('#cFrom').value,to=$('#cTo').value;
      if(from===to){flash('A transfer needs two different pots.');return;}
      S.ui.d.pot=from;
      S.cb.push({id:rid(),d,t:XFER,x:from+' → '+to,in:0,out:v,p:from,p2:to});}
    else{const p=$('#cPot').value;S.ui.d.pot=p;
      const row={id:rid(),d,t:ty,x:$('#cDetail').value,in:0,out:0,p};
      if(IN_TYPES.includes(ty))row.in=v;else row.out=v;
      S.cb.push(row);}
    saveCb([d]);$('#cAmt').value='';render();}
  else if(a==='cbDel'){const id=el.dataset.row,r=byId(S.cb,id);if(!r)return;
    S.cb=S.cb.filter(x=>x.id!==id);saveCb([r.d]);render();}
  else if(a==='cbAll'){S.ui.d.cbAll=!S.ui.d.cbAll;render();}
  else if(a==='rcDel'){const id=el.dataset.rc,r=byId(S.rc,id);if(!r)return;
    S.rc=S.rc.filter(x=>x.id!==id);saveYr('rc',S.rc,[r.d]);render();}
  else if(a==='puAdd'){const d=$('#pDate').value,v=num($('#pAmt').value);
    if(!d||!v){flash('A date and a total are needed.');return;}
    S.pu.push({id:rid(),d,s:$('#pSup').value,no:$('#pNo').value,w:$('#pWhat').value,amt:v,terms:$('#pTerms').value});
    saveYr('pu',S.pu,[d]);$('#pAmt').value='';$('#pNo').value='';render();}
  else if(a==='puDel'){const id=el.dataset.pu,r=byId(S.pu,id);if(!r)return;
    S.pu=S.pu.filter(x=>x.id!==id);saveYr('pu',S.pu,[r.d]);render();}
  else if(a==='invAdd'){const d=$('#invNew').value;if(!d)return;
    S.inv[d]=S.inv[d]||{counts:{}};S.ui.d.inv=d;saveInv(d);render();}
  else if(a==='invDel'){const d=el.dataset.d;
    const used=Object.values(S.closed).find(c=>c&&c.countDate===d);
    if(used){flash('That count is part of the closed record for '+monthName(used.month)+', so it cannot be deleted. Reopen that month first.');return;}
    if(hasCounts(d)&&S.ui.d.delCount!==d){S.ui.d.delCount=d;
      flash('That count has quantities in it. Press Delete again to remove it for good.');render();return;}
    delete S.inv[d];S.ui.d.delCount=null;S.ui.d.inv=null;
    writeLocal();
    flash('Count for '+d+' deleted.');render();}
  else if(a==='elecPay'){
    const m=el.dataset.m,x=elecCalc(m).find(y=>y.row.m===m);
    if(!x||x.total==null){flash('Nothing billed for that month yet.');return;}
    if(elecOwedFor(m)<=0){flash(monthName(m)+' electricity is already paid.');return;}
    const d=today(),det=elecDetails();
    const parts=[[det[0],x.priv],[det[1]||det[0],x.elev],[det[2]||det[0],x.pub]];
    let added=0;
    parts.forEach(([detail,amt])=>{if(!amt)return;
      S.cb.push({id:rid(),d,t:EPAY,x:detail,in:0,out:amt,p:defaultPot(),m:m});added++;});
    saveCb([d]);
    flash('Paid '+money(x.total)+' for '+monthName(m)+' \u2014 '+added+' entries dated today, out of '+defaultPot()+
      '. Profit is unchanged; this only settles what was owed.');
    render();}
  else if(a==='pay'){
    if(!S.db){flash('Not connected to the shared data, so nothing can be saved. Reload the page.');return;}
    /* Read the box in this very row. Looking it up by name would trust that no
       two rows on the page share one, and the amounts here are too large to rest
       on that. */
    const row=el.closest('tr');
    const inEl=el.dataset.in
      ? ((row&&row.querySelector('input'))||document.getElementById(el.dataset.in))
      : null;
    const amt=num(inEl?inEl.value:el.dataset.amt);
    if(!amt){flash('Put an amount in before paying.');return;}
    const d=($('#settleDate')&&$('#settleDate').value)||today();
    const sm=monthOf(S.ui.start);
    const pot=($('#settlePot')&&$('#settlePot').value)||defaultPot();
    S.ui.d.pot=pot;
    const ty=el.dataset.t;
    if(ty===EPAY){
      /* the three electricity bills are paid together, split as they were billed */
      const m=el.dataset.m,x=elecCalc(m).find(y=>y.row.m===m),det=elecDetails();
      const parts=[[det[0],x&&x.priv],[det[1]||det[0],x&&x.elev],[det[2]||det[0],x&&x.pub]];
      let n=0;parts.forEach(([detail,a2])=>{if(!a2)return;
        S.cb.push({id:rid(),d,t:EPAY,x:detail,in:0,out:a2,p:pot,m:m});n++;});
      if(!n){flash('Nothing billed for that month.');return;}
    } else {
      S.cb.push({id:rid(),d,t:ty,x:el.dataset.x,in:0,out:amt,p:pot,m:sm});
    }
    el.disabled=true;note('Paying\u2026');
    saveCb([d]).then(ok=>{render();
      if(ok)flash('Paid '+money(amt)+' \u2014 '+esc(el.dataset.x)+', out of '+pot+', dated '+d+
        ', settling '+monthName(sm)+'.');});}
  else if(a==='closeAsk'){
    if(S.ui.start>today()){flash('That month has not started yet. There is nothing to close.');return;}
    S.ui.d.confirmClose=monthOf(S.ui.start);render();}
  else if(a==='closeNo'){S.ui.d.confirmClose=null;render();}
  else if(a==='closeGo'){closeMonth();render();}
  else if(a==='reopen'){reopen();render();}
    else if(a==='addPot'){S.setup.pots=pots().concat([{name:'New pot',kind:'own'}]);go();}
  else if(a==='delPot'){const gone=pots()[+el.dataset.i];
    /* Deleting a pot used to take its balance with it and orphan every entry
       that pointed at it. Move the money out first, as a Cash Transfer. */
    const used=gone?S.cb.filter(e=>potOf(e)===gone.name||e.p2===gone.name).length:0;
    if(used){flash(gone.name+' has '+used+' entr'+(used===1?'y':'ies')+' against it and holds '
      +money(potBalance(gone.name))+'. Move that to another pot with a Cash Transfer first.');return;}
    S.setup.pots=pots().filter((x,i)=>i!==+el.dataset.i);go();}
  else if(a==='addPartner'){(S.setup.partners=S.setup.partners||[]).push({name:'New partner',share:0});go();}
  else if(a==='delPartner'){S.setup.partners.splice(+el.dataset.i,1);go();}
  else if(a==='addStaff'){(S.setup.staff=S.setup.staff||[]).push({name:'New staff',salary:0,carryIn:0});go();}
  else if(a==='delStaff'){S.setup.staff.splice(+el.dataset.i,1);go();}
  else if(a==='addFixed'){(S.setup.fixedExpenses=S.setup.fixedExpenses||[]).push({name:'New expense',amount:0});go();}
  else if(a==='delFixed'){S.setup.fixedExpenses.splice(+el.dataset.i,1);go();}
  else if(a==='addSupplier'){(S.setup.suppliers=S.setup.suppliers||[]).push('New supplier');go();}
  else if(a==='delSupplier'){S.setup.suppliers.splice(+el.dataset.i,1);go();}
  else if(a==='addCat'){const x=(S.setup.types||[]).find(y=>y.name==='Daily Expense');
    if(x)(x.details=x.details||[]).push('New category');go();}
  else if(a==='delCat'){const x=(S.setup.types||[]).find(y=>y.name==='Daily Expense');
    if(x)x.details.splice(+el.dataset.i,1);go();}
  else if(a==='addItem'){(S.setup.stockItems=S.setup.stockItems||[]).push(
    {name:'New item',category:(S.setup.categories||[])[0],unit:'Piece',price:0,supplier:(S.setup.suppliers||[])[0],per:1});go();}
  else if(a==='delItem'){S.setup.stockItems.splice(+el.dataset.i,1);go();}
  else if(a==='addTare'){(S.setup.tare=S.setup.tare||[]).push({name:'New bucket',g:0});go();}
  else if(a==='delTare'){S.setup.tare.splice(+el.dataset.i,1);go();}
  else if(a==='backup'){backupNow();}
  else if(a==='restoreAsk'){
    if(!confirm('Loading a backup replaces everything in the books with that file.\n\nCarry on?'))return;
    const f=$('#restoreFile');if(f)f.click();}
  else if(a==='gateAllow'){gateAllow();}
  else if(a==='gateOther'){gateOther();}
  else if(a==='gateSkip'){gateSkip();}
  else if(a==='bkChoose'){bkChoose();}
  else if(a==='bkReconnect'){bkReconnect();}
  else if(a==='bkStop'){bkStop();}
  else if(a==='addReason'){(S.setup.reasons=S.setup.reasons||[]).push('New reason');go();}
  else if(a==='delReason'){S.setup.reasons.splice(+el.dataset.i,1);go();}
});

document.addEventListener('focusin',function(ev){
  if(!wantsAll(ev.target))return;
  ev.target.dataset.pickall='1';
  pickAll(ev.target);
});

document.addEventListener('mouseup',function(ev){
  const t=ev.target;
  if(t&&t.dataset&&t.dataset.pickall){delete t.dataset.pickall;ev.preventDefault();pickAll(t);}
},true);

document.addEventListener('focusout',function(ev){
  if(ev.target&&ev.target.dataset)delete ev.target.dataset.pickall;
});

document.addEventListener('change',function(ev){
  const t=ev.target;
  if(t.id==='restoreFile'){if(t.files&&t.files[0])restoreFrom(t.files[0]);t.value='';return;}
  if(t.id==='cType'){S.ui.d.cbType=t.value;render();return;}
  if(t.id==='nCat'){S.ui.d.cat=t.value;render();return;}
  if(t.id==='nightDate'){S.ui.d.night=t.value;render();return;}
  if(t.id==='invPick'){S.ui.d.inv=t.value;render();return;}
  if(t.id==='nNote'){return;}  /* saved with the count*/
  if(t.dataset.pot){return;}  /* counts are committed by the button, not on the way past */
  if(t.dataset.row){const r=byId(S.cb,t.dataset.row);if(!r)return;const k=t.dataset.k,old=r.d;
    r[k]=(k==='in'||k==='out')?num(t.value):t.value;
    if(k==='in'&&num(t.value))r.out=0;if(k==='out'&&num(t.value)&&r.t!==XFER)r.in=0;
    if(k==='t'){
      /* A sale switched to an expense used to keep its money on the In side:
         it never touched profit and still added to cash. Follow the kind. */
      if(r.t!==XFER){const amt=num(r.in)||num(r.out);
        if(IN_TYPES.includes(r.t)){r.in=amt;r.out=0;}else{r.out=amt;r.in=0;}}
      if(r.t===XFER&&!r.p2)r.p2=pots().map(p=>p.name).find(n=>n!==potOf(r))||potOf(r);
      if(!typeDetails(r.t).includes(r.x))r.x=typeDetails(r.t)[0]||'';}
    saveCb([old,r.d]);redraw(t);return;}
  if(t.dataset.pu){const r=byId(S.pu,t.dataset.pu);if(!r)return;const k=t.dataset.k,old=r.d;
    r[k]=k==='amt'?num(t.value):t.value;saveYr('pu',S.pu,[old,r.d]);redraw(t);return;}
  if(t.dataset.inv){const date=S.ui.d.inv||countForPeriod()||today();
    S.inv[date]=S.inv[date]||{counts:{}};S.inv[date].counts=S.inv[date].counts||{};
    const c=S.inv[date].counts[t.dataset.inv]=S.inv[date].counts[t.dataset.inv]||{};
    c[t.dataset.k]=t.dataset.k==='bucket'?t.value:(t.value===''?null:num(t.value));
    saveInv(date);redraw(t);return;}
  if(t.dataset.set){const kind=t.dataset.set,i=+t.dataset.i,k=t.dataset.k,v=t.value;
    if(kind==='suppliers'){const old=S.setup.suppliers[i];S.setup.suppliers[i]=v;
      S.cb.forEach(e=>{if(e.x===old)e.x=v;});S.pu.forEach(p=>{if(p.s===old)p.s=v;});
      (S.setup.stockItems||[]).forEach(it=>{if(it.supplier===old)it.supplier=v;});
      if(S.debt.brought&&old in S.debt.brought){S.debt.brought[v]=S.debt.brought[old];delete S.debt.brought[old];saveDebt();}}
    else if(kind==='expcats'){const x=(S.setup.types||[]).find(y=>y.name==='Daily Expense');if(x)x.details[i]=v;}
    else if(kind==='reasons'){S.setup.reasons[i]=v;}
    else if(kind==='pots'){const p=pots();const old=p[i].name;p[i][k]=v;S.setup.pots=p;
      if(k==='name'){S.cb.forEach(e=>{if(e.p===old)e.p=v;if(e.p2===old)e.p2=v;});
        S.rc.forEach(r=>{if(r.counts&&old in r.counts){r.counts[v]=r.counts[old];delete r.counts[old];}});}}
    else{const row=(S.setup[kind]||[])[i];if(row)row[k]=['name','category','unit','supplier','kind'].includes(k)?v:num(v);}
    saveSetup();redraw(t);return;}
  if(t.dataset.biz){S.setup.business=S.setup.business||{};
    S.setup.business[t.dataset.biz]=t.dataset.biz==='rounding'?num(t.value):t.value;saveSetup();redraw(t);return;}
  if(t.dataset.conv){S.setup.conversions[t.dataset.conv]=num(t.value);saveSetup();redraw(t);return;}
  if(t.dataset.elecf){S.elec=S.elec||{factors:{},rows:[]};
    S.elec.factors=Object.assign({},elecFactors(),{[t.dataset.elecf]:num(t.value)});
    saveElec();redraw(t);return;}
  if(t.dataset.elec){const m=t.dataset.elec,k=t.dataset.k;
    S.elec=S.elec||{factors:elecFactors(),rows:[]};
    /* elecRows() without the month would not invent the row the card is showing,
       so the first figure typed for a new month used to go nowhere. */
    const rows=elecRows(m).map(r=>Object.assign({},r));
    const row=rows.find(r=>r.m===m);
    row[k]=t.value===''?null:num(t.value);
    S.elec.rows=rows;saveElec();redraw(t);return;}
  if(t.dataset.debt){S.debt[t.dataset.debt]=t.value;saveDebt();render();return;}
  if(t.dataset.debtsup){S.debt.brought=S.debt.brought||{};S.debt.brought[t.dataset.debtsup]=num(t.value);saveDebt();redraw(t);return;}
});

render();

connect().then(render).catch(()=>render());
