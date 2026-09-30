import {GOALS,makeSnapshot} from './checkup-model.mjs';
import {QUESTIONS,relevantInput,safeContext,journeyHref} from './journey-model.mjs';
const $=id=>document.getElementById(id);
const form=$('checkup-form');
const context=safeContext(location.search);
const preset=context.goal;
if(Object.hasOwn(GOALS,preset)) form.elements.goal.value=preset;
let step=1;
let branch=null;
function syncAmounts(){
 const show=form.elements.goal.value==='debt'&&form.elements.homeowner?.value!=='No';
 $('debt-amounts').hidden=!show;$('debt-amounts').disabled=!show;
 $('no-home-note').hidden=!(form.elements.goal.value==='debt'&&!show);
}
function renderQuestions(){
 const goal=form.elements.goal.value;
 if(branch!==goal){
  $('number-error').textContent='';
  $('goal-questions').replaceChildren();
  for(const [name,label,options] of QUESTIONS[goal]||[]){
   const l=document.createElement('label');l.className='field';l.htmlFor='question-'+name;l.textContent=label;
   const select=document.createElement('select');select.id=l.htmlFor;select.name=name;
   select.append(new Option('Choose an option (optional)',''),...options.map(v=>new Option(v,v)));
   select.addEventListener('change',syncAmounts);$('goal-questions').append(l,select);
  }
  if(goal==='second-opinion'&&new URLSearchParams(location.search).get('topic')==='renewal')form.elements.question.value='A mortgage renewal';
  branch=goal;
 }
 $('step-title-2').textContent={'self-employed':'A little about your business.',debt:'What would you like to change?','second-opinion':'What would you like to understand?'}[goal];
 $('skip-to-contact').href=journeyHref('/request/',goal,context.source);
 syncAmounts();
}
form.addEventListener('change',()=>{$('skip-to-contact').href=journeyHref('/request/',form.elements.goal.value,context.source);});
if(preset)$('skip-to-contact').href=journeyHref('/request/',preset,context.source);
function showStep(next){
  step=next;
  for(let n=1;n<=3;n++){
    $('step-'+n).hidden=n!==step;
    if(n===step)$('progress-'+n).setAttribute('aria-current','step');
    else $('progress-'+n).removeAttribute('aria-current');
  }
  form.hidden=step===3;
  (step===3?$('report-title'):$('step-title-'+step)).focus();
}
$('next-step').addEventListener('click',()=>{
  const goal=form.elements.goal.value,province=form.elements.province.value;
  if(!goal||!province){$('step-error').textContent=!goal?'Choose the goal that best fits your situation.':'Choose a province to continue the demo.';(!goal?form.querySelector('[name=goal]'):$('province')).focus();return;}
  $('step-error').textContent='';renderQuestions();showStep(2);
});
$('back-step').addEventListener('click',()=>showStep(1));
$('edit-values').addEventListener('click',()=>{renderQuestions();showStep(2);});
$('clear-sample').addEventListener('click',()=>{
  form.reset();
  for(const id of ['step-error','number-error','report-goal','report-next'])$(id).textContent='';
  $('report-values').replaceChildren();$('report-checks').replaceChildren();$('report-answers').replaceChildren();branch=null;$('goal-questions').replaceChildren();$('skip-to-contact').href='/request/';
  showStep(1);
});
form.addEventListener('submit',event=>{
  event.preventDefault();
  const invalid=[...form.querySelectorAll('input[type="number"]')].find(input=>!input.matches(':disabled')&&!input.validity.valid);
  if(invalid){
    const label=form.querySelector('label[for="'+invalid.id+'"]').textContent.replace(' (optional)','');
    $('number-error').textContent=label+': enter a complete amount from 0 to 100,000,000 with no more than two decimal places, or leave it empty.';
    invalid.focus();return;
  }
  let snapshot;
  const relevant=relevantInput(Object.fromEntries(new FormData(form)));
  try{snapshot={...makeSnapshot(relevant.input),...relevant.review};}
  catch(error){$('number-error').textContent=error.message;return;}
  $('number-error').textContent='';
  const province={AB:'Alberta',ON:'Ontario',OTHER:'Another province'}[snapshot.province];
  $('report-goal').textContent=snapshot.name+' · '+province+'. This province selection does not confirm service availability.';
  $('report-answers').replaceChildren();
  for(const [label,value] of relevant.answers){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('report-answers').append(dt,dd);}
  $('equity-caution').hidden=!relevant.amounts;
  const currency=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:2});
  const values=$('report-values');values.replaceChildren();
  for(const [key,label] of [['homeValue','Home value entered'],['mortgageBalance','Secured debt balance entered'],['otherDebt','Other debts entered'],['equity','Illustrative equity difference']]){
    if(snapshot[key]===null)continue;
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=currency.format(snapshot[key]);values.append(dt,dd);
  }
  values.hidden=!values.children.length;
  $('report-checks').replaceChildren(...snapshot.checks.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('report-next').textContent=snapshot.next;
  // Carry only the review goal. Never put sample financial values into a URL.
  $('review-handoff').href=journeyHref('/request/',snapshot.goal,context.source);
  showStep(3);
});
$('print-report').addEventListener('click',()=>window.print());
