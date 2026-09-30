export const GOALS = {
  'self-employed': {name:'Self-employed mortgage options', checks:['How the business earns and how you pay yourself','Business expenses, tax records and bank statements','Your debts, credit profile and the lender’s documentation requirements'], next:'A conversation about your business and income records can identify documentation questions to explore. Business revenue is not automatically personal qualifying income.'},
  debt: {name:'Debt and home equity review', checks:['Current mortgage terms and any early-repayment penalties','Debt balances, rates, payments and repayment periods','Setup fees, total interest and the risk of securing debt on your home'], next:'Compare the full cost of keeping your existing debts with any suitable alternatives. Consolidation may extend repayment and increase total interest.'},
  'second-opinion': {name:'A mortgage second opinion', checks:['The reason for the original decision or your renewal question','The income, debts and property information behind the file','What additional records or preparation may be needed'], next:'Clarify what may be holding the file back before exploring another route. A second opinion does not promise a lender offer or approval.'},
};
export function parseOptionalMoney(value){
  if(value === undefined || value === null || String(value).trim()==='') return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>100000000) throw new RangeError('Use an amount from $0 to $100,000,000, or leave the field empty.');
  return Math.round(n*100)/100;
}
export function makeSnapshot(input){
  if(!Object.hasOwn(GOALS,input.goal)) throw new Error('Choose a review goal.');
  if(!['AB','ON','OTHER'].includes(input.province)) throw new Error('Choose a province.');
  const homeValue=parseOptionalMoney(input.homeValue),mortgageBalance=parseOptionalMoney(input.mortgageBalance),otherDebt=parseOptionalMoney(input.otherDebt);
  const equity=homeValue!==null&&mortgageBalance!==null?Math.round((homeValue-mortgageBalance)*100)/100:null;
  return {goal:input.goal,province:input.province,homeValue,mortgageBalance,otherDebt,equity,...GOALS[input.goal],eligible:false,reviewed:false};
}
