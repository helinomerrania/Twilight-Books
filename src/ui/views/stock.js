/* Stock: what arrived, what is left, what is owed for it. */
import {countPicker, receiptForm, stockCount, stockFigures,
        stockHistory, supplierAccounts} from '../cards/stockcards.js';
import {VIEWS} from '../render.js';

VIEWS.stock=function(){
  return countPicker()+stockFigures()+stockCount()+receiptForm()
       + supplierAccounts()+stockHistory();
};
