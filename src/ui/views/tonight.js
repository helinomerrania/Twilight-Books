/* Tonight: the nightly job and nothing else. What is wrong leads, because a
   problem seen tonight is worth ten found at month end. */
import {allChecks, needsALook} from '../cards/checks.js';
import {closingUp, todayEntries, todayFigures} from '../cards/night.js';
import {VIEWS} from '../render.js';

VIEWS.tonight=function(){
  return needsALook()+closingUp()+todayFigures()+todayEntries();
};
