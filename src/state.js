/* No books are shipped with the app. A fresh copy starts empty and the first run asks for your details; an existing copy reads the folder and this browser. */
export const SEED={v:1,setup:null,cb:[],pu:[],rc:[],inv:{},ledger:[],closed:{},debt:{asAt:null,brought:{}},elec:null,log:[]};

/* ============================================================ state */
export const S={setup:null,cb:[],pu:[],rc:[],inv:{},ledger:[],closed:{},debt:{asAt:null,brought:{}},elec:null,log:[],
         ui:{tab:'tonight',start:null,end:null,d:{},drill:null,logAll:false},db:null};

export const TABS=[['tonight','Tonight'],['dashboard','Dashboard'],['cashbook','Cashbook'],
            ['cash','Cash & counts'],['stock','Stock & suppliers'],['settlement','Settlement'],['setup','Setup']];

export const IN_TYPES=['Daily Sales','Other Income','Owner Repayment','Owner Capital In'];

export const XFER='Cash Transfer';

export const EPAY='Electricity Payment';

/* the money-out types that actually happen at closing time, commonest first */
export const NIGHT_TYPES=[['Daily Expense','Expense'],['Staff Advance','Staff advance'],
  ['Owner Advance','Owner advance'],['Salary Payment','Salary'],['Supplier Payment','Supplier'],
  ['Fixed Expense Payment','Rent / fixed'],['Monthly Bill','Bill']];

export const NIGHT_NOTE={
  'Daily Expense':'A cost of running today. It comes straight off this month\u2019s profit.',
  'Staff Advance':'Money a staff member keeps. It comes off their salary at month end, so it never touches profit.',
  'Owner Advance':'A partner taking money out. It comes off their share, not off profit.',
  'Salary Payment':'Paying a salary. The whole salary is already charged to the month, so this is only cash leaving.',
  'Supplier Payment':'Paying down a supplier debt. The goods are already in cost of goods, so profit does not change.',
  'Fixed Expense Payment':'Paying rent or another fixed cost. It is already charged to every month, so this is only cash leaving.',
  'Monthly Bill':'Internet and the like. It comes off this month\u2019s profit when you enter it.'};

export const LS='twilight-books-v1';

export const APP_VERSION='2026.11.16';
