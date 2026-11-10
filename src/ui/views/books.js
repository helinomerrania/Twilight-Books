/* The record. Everything that has been entered, counted or changed, and the
   only place anything gets corrected. */
import {countHistory, entryForm, entryList, whereMoneyIs} from '../cards/books.js';
import {recentCard} from '../parts.js';
import {VIEWS} from '../render.js';

VIEWS.books=function(){
  return entryForm()+entryList()+whereMoneyIs()+countHistory()+recentCard();
};
