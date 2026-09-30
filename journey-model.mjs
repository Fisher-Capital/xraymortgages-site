// Deliberately limited to structured, non-identifying preview choices.
export const QUESTIONS={
 'self-employed':[
 ['purpose','What are you planning?',['Buying a home','Renewing a mortgage','Refinancing','Not sure yet']],
 ['business','How is your business set up?',['Sole proprietor','Incorporated business','Partnership','Not sure']],
 ['operating','How long have you been in business?',['Under 1 year','1 to 2 years','More than 2 years','Not sure']],
 ['paid','How do you pay yourself?',['Business income','Salary','Dividends','A mix','Not sure']]],
 debt:[['homeowner','Do you own a home?',['Yes','No','Not sure']],['debtGoal','What would you like to explore?',['Fewer monthly payments','More room in my monthly budget','Home improvements','Understanding my options','Not sure']]],
 'second-opinion':[
 ['question','What would you like a second opinion on?',['A bank decline','A mortgage renewal','A mortgage offer','Not sure']],
 ['reason','What reason were you given?',['Income or documents','Credit history or debts','Property or down payment','No reason was explained','Not applicable','Not sure']],
 ['timing','When do you need to decide?',['Within a month','In 1 to 3 months','Later than 3 months','Just exploring','Not sure']]]
};
export function relevantInput(input){
 const questions=QUESTIONS[input.goal]||[];
 const answers=questions.flatMap(([key,label,options])=>options.includes(input[key])?[[label,input[key]]]:[]);
 const amounts=input.goal==='debt'&&input.homeowner!=='No';
 const review=input.goal==='debt'&&input.homeowner==='No'?{checks:['Which debts and monthly payments you want to discuss','Your income and regular commitments','What kind of help fits your situation'],next:'No home equity calculation is included. Talk with Ray about the right starting point for your questions.'}:{};
 return {answers,amounts,review,input:{...input,homeValue:amounts?input.homeValue:'',mortgageBalance:amounts?input.mortgageBalance:'',otherDebt:amounts?input.otherDebt:''}};
}
export function safeContext(search){
 const params=new URLSearchParams(search);const goal=params.get('goal');const source=params.get('source');
 return {goal:goal==='debt-review'?'debt':Object.hasOwn(QUESTIONS,goal)?goal:null,source:/^(SE|DEBT|SO)-(sq|pt|st)$/.test(source||'')?source:null};
}
export function journeyHref(path,goal,source){
 const query=new URLSearchParams();if(Object.hasOwn(QUESTIONS,goal))query.set('goal',goal);if(/^(SE|DEBT|SO)-(sq|pt|st)$/.test(source||''))query.set('source',source);
 return path+(query.size?'?'+query:'');
}
