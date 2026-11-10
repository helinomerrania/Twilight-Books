/* The month, in the order it gets worked through once: see how it went, check
   what is off, look at where the money went, put the electricity in, settle up,
   then close it. */
import {allChecks} from '../cards/checks.js';
import {monthFigures, moneyFlow, salesByDay} from '../cards/money.js';
import {partnersCard, payrollCard} from '../cards/people.js';
import {closeCard, closedMonthsCard, resultCard} from '../cards/result.js';
import {elecCard, periodCard, settleCard} from '../parts.js';
import {frozen} from '../../core/months.js';
import {VIEWS} from '../render.js';

VIEWS.month=function(){
  const closed=!!frozen();
  return periodCard()
       + monthFigures()
       + resultCard()
       + allChecks()
       + moneyFlow()
       + salesByDay()
       + elecCard()
       + (closed?'':settleCard())
       + payrollCard()
       + partnersCard()
       + closeCard()
       + closedMonthsCard();
};
