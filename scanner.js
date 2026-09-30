const stage=document.getElementById('scan-stage'),range=document.getElementById('scan-position');
const root=stage.closest('.xray-experience');
const play=document.getElementById('scan-play');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let frame=null,playing=false,phase=0,lastTime=null,hold=0,inView=true;
function updatePlay(){
 play.textContent=playing?'Pause scan':'Play scan';
 play.setAttribute('aria-label',playing?'Pause automatic tablet movement':'Start automatic tablet movement');
}
function cancelFrame(){if(frame!==null)cancelAnimationFrame(frame);frame=null;lastTime=null;}
function stop(){playing=false;cancelFrame();updatePlay();}
function schedule(){if(playing&&inView&&!document.hidden&&frame===null)frame=requestAnimationFrame(tick);}
function tick(now){
 frame=null;
 if(!playing||!inView||document.hidden){lastTime=null;return;}
 const elapsed=lastTime===null?0:Math.min(now-lastTime,100);lastTime=now;
 if(hold>0)hold=Math.max(0,hold-elapsed);
 else {phase+=elapsed/20000*Math.PI*2;setScan(50+50*Math.sin(phase));}
 schedule();
}
function start({automatic=false,centred=false}={}){
 if(automatic&&motionPreference.matches){stop();return;}
 cancelFrame();
 if(centred){setScan(50);phase=0;hold=1200;}
 else {phase=Math.asin(Math.max(-1,Math.min(1,(Number(range.value)-50)/50)));hold=0;}
 playing=true;updatePlay();schedule();
}
function isDocument(){return root.dataset.mode!=='equity';}
function setScan(raw){
 const n=Math.max(0,Math.min(100,Number(raw)));range.value=String(n);
 // Document edges are at 13% and 87%. Park the 48%-wide tablet
 // beyond either edge so the entire original page can be read.
 const left=isDocument()?-39+n*1.3:3+n*.46;
 root.style.setProperty('--tablet-left',left+'%');
 range.setAttribute('aria-valuetext',isDocument()&&(n===0||n===100)?'Tablet moved aside. Full original page visible.':'Tablet position '+Math.round(n)+' percent from left to right');
}
range.addEventListener('input',()=>{stop();setScan(range.value);});
function fromPointer(event){const rect=stage.getBoundingClientRect(),position=(event.clientX-rect.left)/rect.width*100;setScan(isDocument()?position:(position-27)/.46);}
stage.addEventListener('pointerdown',event=>{stop();stage.setPointerCapture(event.pointerId);fromPointer(event);});
stage.addEventListener('pointermove',event=>{if(stage.hasPointerCapture(event.pointerId))fromPointer(event);});
stage.addEventListener('pointerup',event=>{if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);});
const layers={
 equity:['01 / HOME EQUITY','There may be more to your home than its price.','Home value minus what is secured against it is a starting point. The amount you could borrow depends on a full assessment.'],
 income:['02 / INCOME PICTURE','A tax return is one layer of the story.','Some mortgage programs may consider business bank statements and cash flow. Expenses, supporting records and lender requirements still matter.'],
 costs:['03 / BORROWING COSTS','See what a smaller payment can leave out.','Compare the interest, fees, penalties and repayment period. A lower monthly payment can still mean a higher total cost.'],
};
const scenes={
 equity:['house-exterior.jpg','house-xray.jpg','White house','Conceptual money inside a blue transparent house','Glide the tablet to reveal conceptual money inside the home.','Concept illustration. Money shown is not an estimate of equity or available funds.'],
 income:['income-surface.svg','income-reveal.svg','Tax return as one view of business income','Bank statements, expenses and cash flow behind the tax return','Glide the tablet to explore the records behind business income.','Concept illustration. Business revenue is not automatically qualifying personal income.'],
 costs:['costs-surface.svg','costs-reveal.svg','Monthly mortgage payment with no amount quoted','Interest, fees, penalties and repayment time behind the payment','Glide the tablet to explore the costs behind a monthly payment.','Concept illustration. No rate, payment or savings is being quoted.'],
};
// Warm the lightweight vector layers so a change does not flash an empty screen.
for(const key of ['income','costs'])for(const file of scenes[key].slice(0,2)){const img=new Image();img.src='/assets/'+file;}
for(const button of document.querySelectorAll('[data-layer]'))button.addEventListener('click',()=>{
 stop();
 const key=button.dataset.layer;root.dataset.mode=key;
 const [base,inside,baseAlt,insideAlt,description,note]=scenes[key];
 const surface=document.getElementById('scan-surface'),reveal=document.getElementById('scan-inside');
 surface.src='/assets/'+base;surface.alt=baseAlt;reveal.src='/assets/'+inside;reveal.alt=insideAlt;
 stage.setAttribute('aria-label',description);root.querySelector('.scan-disclaimer').textContent=note;
 root.querySelector('.scan-hint').innerHTML='<span>←</span> '+(key==='equity'?'GLIDE THE TABLET':'SLIDE ASIDE TO READ THE PAGE')+' <span>→</span>';
 setScan(50);
 for(const b of document.querySelectorAll('[data-layer]'))b.setAttribute('aria-pressed',String(b===button));
 const [label,title,copy]=layers[key];document.getElementById('scan-layer-label').textContent=label;document.getElementById('scan-insight-title').textContent=title;document.getElementById('scan-description').textContent=copy;
 start({automatic:true,centred:true});
});
play.addEventListener('click',()=>{if(playing)stop();else start();});
// Stop when the user reaches the position control, before keyboard or drag input.
range.addEventListener('pointerdown',stop);
range.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))stop();});
motionPreference.addEventListener('change',()=>{if(motionPreference.matches)stop();});
document.addEventListener('visibilitychange',()=>{cancelFrame();schedule();});
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;cancelFrame();schedule();},{threshold:0}).observe(stage);
window.addEventListener('pagehide',stop);
setScan(50);start({automatic:true,centred:true});
