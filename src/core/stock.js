import {S} from '../state.js';
import {mround, num} from '../util/money.js';
import {inPer, monthOf, ymd} from '../util/dates.js';

/* ---- stock */
export function tareOf(name){const t=((S.setup.tare)||[]).find(x=>x.name===name);return t?num(t.g):0;}

export function catLetter(c){return String(c||'').trim().charAt(0).toUpperCase();}

export function hasCounts(date){const d=S.inv[date];return !!(d&&d.counts&&Object.keys(d.counts).length);}

export function countsFor(date){const d=S.inv[date];return (d&&d.counts)||{};}

/* a closed count keeps the prices it was valued at, so re-pricing an item later
   never moves a month that is already shut */
export function priceOf(item,date){const d=S.inv[date];
  if(d&&d.prices&&d.prices[item.name]!=null)return num(d.prices[item.name]);
  return num(item.price);}

export function itemQty(item,counts){
  const c=counts[item.name]||{},cv=S.setup.conversions||{},L=catLetter(item.category);
  const gk=num(cv.gramsPerKilo)||1000,gp=num(cv.gramsPerPack)||50,
        pb=num(cv.packsPerBlock)||10,bc=num(cv.blocksPerCarton)||12,bk=num(cv.bucketsPerCarton)||2;
  if(L==='A')return Math.max(num(c.g)-tareOf(c.bucket),0)/gk;
  if(L==='B'){const perBlock=pb*gp/gk;
    return num(c.cartons)*bc*perBlock+num(c.blocks)*perBlock+num(c.packs)*(gp/gk);}
  if(L==='E')return num(c.cartons)+num(c.buckets)/bk;
  return num(c.pkg)+num(c.pcs)/(num(item.per)||1);}

export function itemValue(item,counts,date){return itemQty(item,counts)*priceOf(item,date);}

export function blockTotals(date){const counts=countsFor(date),out={};
  for(const it of S.setup.stockItems||[]){const L=catLetter(it.category);
    out[L]=out[L]||{qty:0,value:0};out[L].qty+=itemQty(it,counts);out[L].value+=itemValue(it,counts,date);}
  return out;}

export function stockValue(date){const b=blockTotals(date);let t=0;for(const k in b)t+=b[k].value;return t;}

export function countDates(){return Object.keys(S.inv).sort();}

/* a count that has no quantities and no booked figure has been opened but not done,
   so it must never be used to value the stock */
export function isCounted(date){const d=S.inv[date];return hasCounts(date)||!!(d&&d.closing!=null);}

export function valuedDates(){return countDates().filter(isCounted);}

/* what the count was booked at — the figure that carries into the next month */
export function booked(date){if(!date)return 0;const d=S.inv[date];if(!d)return 0;
  /* Once a month is closed its stock value is a record, not a calculation.
     Re-pricing an item, or changing a bucket tare or a conversion, must not
     reach back and move a month that is already settled. */
  if(d.closing!=null&&(S.closed[monthOf(date)]||!hasCounts(date)))return num(d.closing);
  return mround(stockValue(date));}

export function countForPeriod(){const d=valuedDates().filter(x=>x<=S.ui.end);return d.length?d[d.length-1]:null;}

export function openingDate(){const d=valuedDates().filter(x=>x<S.ui.start);return d.length?d[d.length-1]:null;}

export function openingStock(){const d=openingDate();return d?booked(d):0;}

/* When the month holds its own count, what was bought is measured from the
   previous count to that one - otherwise a count taken on the 1st would be set
   against a whole month of receipts. With no count this month, the period stands. */
export function purchasesIn(){
  const cd=countForPeriod(),od=openingDate();
  const from=(cd&&cd>=S.ui.start&&od)?od:null,to=(cd&&cd>=S.ui.start)?cd:null;
  let t=0;
  for(const p of S.pu){const d=ymd(p.d);
    if(from!=null){if(d>from&&d<=to)t+=num(p.amt);}
    else if(inPer(p.d))t+=num(p.amt);}
  return t;}

export function cogs(){const cd=countForPeriod(),closing=cd?booked(cd):0,opening=openingStock(),purch=purchasesIn();
  /* Stock you still have cannot exceed what you started with plus what you bought. When it does,
     nothing was consumed to measure — either this is the first count, setting the opening
     position, or a delivery was never recorded. Either way a negative cost is not a profit. */
  const raw=mround(opening+purch-closing);
  return {opening,purchases:purch,closing,value:Math.max(0,raw),raw,date:cd};}
