/* What is wrong, if anything. It leads the nightly screen in short form so a
   problem is seen the night it happens, and appears in full on the month. */
import {esc} from '../../util/money.js';
import {checks} from '../../core/checks.js';

function line(c){
  return `<div class="check ${c.level==='ok'?'':c.level}"><span class="dot"></span>
    <span><strong>${esc(c.label)}</strong>${c.detail?'<br><span class="val">'+esc(c.detail)+'</span>':''}</span></div>`;
}

/** The short form: only what wants attention, and nothing at all when all is well. */
export function needsALook(){
  const bad=checks().filter(c=>c.level!=='ok');
  if(!bad.length)return '';
  const order={bad:0,warn:1};
  bad.sort((a,b)=>(order[a.level]??2)-(order[b.level]??2));
  const show=bad.slice(0,4);
  return `<div class="card"><div class="cardhead"><h2>Needs a look</h2>
      <button class="mini" data-act="goTab" data-to="month">See all checks</button></div>
    <div class="checks">${show.map(line).join('')}</div>
    ${bad.length>show.length?`<p class="note">${bad.length-show.length} more on the month screen.</p>`:''}
  </div>`;
}

/** The full list, every check, passing ones last. */
export function allChecks(){
  const ck=checks(),bad=ck.filter(c=>c.level!=='ok');
  return `<div class="card"><h2>${bad.length?'Needs a look':'Everything checks out'}</h2>
    <p class="sub">${bad.length?bad.length+' of '+ck.length+' checks want attention':'all '+ck.length+' checks pass'}</p>
    <div class="checks">${ck.slice().sort((a,b)=>(a.level==='ok')-(b.level==='ok')).map(line).join('')}</div>
  </div>`;
}
