import {safeContext,journeyHref} from './journey-model.mjs';
const context=safeContext(location.search);
const pageGoal={'/self-employed/':'self-employed','/debt-review/':'debt','/second-opinion/':'second-opinion'}[location.pathname];
// Carry only allowlisted campaign identity. Never copy financial inputs into links.
for(const link of document.querySelectorAll('a[href^="/checkup/"],a[href^="/request/"]')){
 const url=new URL(link.href);const goal=safeContext(url.search).goal||pageGoal||context.goal;
 link.href=journeyHref(url.pathname,goal,context.source);
 if(goal==='second-opinion'&&url.searchParams.get('topic')==='renewal')link.href+='&topic=renewal';
}
const menu=document.querySelector('.mobile-menu');
menu?.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.open=false));
