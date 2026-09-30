import {safeContext,journeyHref} from './journey-model.mjs';
const form=document.querySelector('#request-router'),goal=document.querySelector('#review-goal'),result=document.querySelector('#route-result'),error=document.querySelector('#route-error'),action=document.querySelector('#route-action');
const context=safeContext(location.search);goal.value=context.goal||'general';
const descriptions={intake:'The callback form is still being prepared. At launch, you will be able to share your contact details and preferred callback time. Nothing has been sent.',booking:'Appointment booking is not open yet. At launch, you will be able to choose an available time for a 20-minute phone conversation. No appointment has been made.',phone:'Ray’s existing contact number is (416) 898-0181. Alberta mortgage service remains pending licence verification and broker approval.'};
const labels={intake:'Preview callback option →',booking:'Preview appointment option →',phone:'Show Ray’s number →'};
function update(){action.textContent=labels[form.elements.route.value];result.replaceChildren();error.textContent='';document.querySelector('#guided-link').href=journeyHref('/checkup/',goal.value,context.source);}
form.addEventListener('change',update);update();
form.addEventListener('submit',event=>{
 event.preventDefault();
 if(!['self-employed','debt','second-opinion','general'].includes(goal.value)){error.textContent='Choose a topic, or select Something else / not sure.';goal.focus();return;}
 result.replaceChildren();const p=document.createElement('p');p.textContent=descriptions[form.elements.route.value];result.append(p);
 if(form.elements.route.value==='phone'){const a=document.createElement('a');a.href='tel:+14168980181';a.textContent='Call (416) 898-0181';result.append(a);}
});
