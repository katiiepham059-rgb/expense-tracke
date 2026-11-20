'use strict';
const TYPES = {
  earning:{label:'Earning',color:'var(--earning)'},
  monthly:{label:'Monthly payment',color:'var(--monthly)'},
  saving:{label:'Savings',color:'var(--saving)'},
  daily:{label:'Daily payment',color:'var(--daily)'},
  unexpected:{label:'Unexpected',color:'var(--unexpected)'}
};
const KEY='expense-tracker-v1', GOAL_KEY='expense-tracker-goal';
const $=id=>document.getElementById(id);
const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const mem={}; // fallback if localStorage unavailable
const store={
  get(k){try{return localStorage.getItem(k)}catch{return mem[k]??null}},
  set(k,v){try{localStorage.setItem(k,v)}catch{mem[k]=v}}
};
let entries=[]; try{entries=JSON.parse(store.get(KEY)||'[]')}catch{entries=[]}
let goal=Number(store.get(GOAL_KEY))||0;
const now=new Date();
let view={y:now.getFullYear(),m:now.getMonth()};
let filter='all';

const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const today=iso(now);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=()=>store.set(KEY,JSON.stringify(entries));
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};

// Entries visible in the selected month. Monthly payments recur every month from their start date.
function monthEntries(y,m){
  const out=[];
  for(const e of entries){
    const d=parse(e.date);
    if(e.type==='monthly'){
      if(d.getFullYear()*12+d.getMonth()<=y*12+m){
        const day=Math.min(d.getDate(),new Date(y,m+1,0).getDate());
        out.push({...e,date:`${y}-${pad(m+1)}-${pad(day)}`,recurring:true});
      }
    } else if(d.getFullYear()===y&&d.getMonth()===m) out.push(e);
  }
  return out.sort((a,b)=>b.date.localeCompare(a.date));
}
const sum=(l,t)=>l.filter(e=>!t||e.type===t).reduce((s,e)=>s+e.amount,0);

function render(){
  $('monthLabel').textContent=new Date(view.y,view.m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const list=monthEntries(view.y,view.m);
  const monday=mondayOf(now), weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);
  const weekEarn=entries.filter(e=>{if(e.type!=='earning')return false;const d=parse(e.date);return d>=monday&&d<weekEnd}).reduce((s,e)=>s+e.amount,0);
  const earn=sum(list,'earning'),mon=sum(list,'monthly'),sav=sum(list,'saving'),day=sum(list,'daily'),unx=sum(list,'unexpected');
  const todaySpend=entries.filter(e=>e.type==='daily'&&e.date===today).reduce((s,e)=>s+e.amount,0);
  const balance=earn-mon-day-unx-sav;
  const cards=[
    ['This week\'s earnings',weekEarn,'earning'],['Earnings (month)',earn,'earning'],
    ['Monthly payments',mon,'monthly'],['Savings',sav,'saving'],
    ['Daily payments (month)',day,'daily'],['Today\'s spending',todaySpend,'daily'],
    ['Unexpected charges',unx,'unexpected'],['Balance',balance,balance<0?'unexpected':'earning']
  ];
  $('cards').innerHTML=cards.map(([l,v,t])=>`<div class="card ${t}" style="--c:${TYPES[t].color}"><small>${l}</small><b>${usd.format(v)}</b></div>`).join('');

  // goal
  $('goal').value=goal||'';
  const pct=goal?Math.min(100,sav/goal*100):0;
  $('goalFill').style.width=pct+'%';
  $('goalText').textContent=goal?`${usd.format(sav)} of ${usd.format(goal)} saved (${pct.toFixed(0)}%)`:'Set a monthly goal to track progress.';

  // weekly chart
  const weeks=[];for(let i=7;i>=0;i--){const d=new Date(monday);d.setDate(d.getDate()-7*i);weeks.push({d,v:0})}
  for(const e of entries)if(e.type==='earning'){const w=mondayOf(parse(e.date)).getTime();const f=weeks.find(x=>x.d.getTime()===w);if(f)f.v+=e.amount}
  const max=Math.max(1,...weeks.map(w=>w.v));
  $('weekChart').innerHTML=`<svg viewBox="0 0 320 170" width="100%" role="img" aria-label="Weekly earnings">`+weeks.map((w,i)=>{
    const h=w.v/max*115,x=10+i*38;
    return `<rect x="${x}" y="${135-h}" width="28" height="${h}" rx="4" fill="var(--earning)"><title>${usd.format(w.v)}</title></rect>`+
      `<text x="${x+14}" y="${128-h}" text-anchor="middle">${w.v?Math.round(w.v):''}</text>`+
      `<text x="${x+14}" y="152" text-anchor="middle">${w.d.getMonth()+1}/${w.d.getDate()}</text>`;
  }).join('')+`</svg>`;

  // donut
  const parts=['monthly','daily','unexpected','saving'].map(t=>({t,v:sum(list,t)})).filter(p=>p.v>0);
  const total=parts.reduce((s,p)=>s+p.v,0);
  if(!total) $('donut').innerHTML='<div class="empty">No spending this month.</div>';
  else{
    let a=-Math.PI/2;const r=60,cx=80,cy=80;
    const arcs=parts.map(p=>{
      const ang=p.v/total*Math.PI*2; if(parts.length===1) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TYPES[p.t].color}" stroke-width="26"/>`;
      const x1=cx+r*Math.cos(a),y1=cy+r*Math.sin(a);a+=ang;const x2=cx+r*Math.cos(a),y2=cy+r*Math.sin(a);
      return `<path d="M${x1} ${y1} A${r} ${r} 0 ${ang>Math.PI?1:0} 1 ${x2} ${y2}" fill="none" stroke="${TYPES[p.t].color}" stroke-width="26"><title>${TYPES[p.t].label}: ${usd.format(p.v)}</title></path>`;
    }).join('');
    $('donut').innerHTML=`<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 160 160" width="160">${arcs}</svg><ul class="list" style="flex:1;min-width:150px">`+
      parts.map(p=>`<li><span class="dot" style="--c:${TYPES[p.t].color}"></span><span class="grow">${TYPES[p.t].label}</span><b>${(p.v/total*100).toFixed(0)}%</b></li>`).join('')+`</ul></div>`;
  }

  // tabs + list
  $('tabs').innerHTML=['all',...Object.keys(TYPES)].map(t=>`<button data-t="${t}" class="${filter===t?'on':''}">${t==='all'?'All':TYPES[t].label}</button>`).join('');
  const shown=list.filter(e=>filter==='all'||e.type===filter);
  $('list').innerHTML=shown.length?shown.map(e=>`<li><span class="dot" style="--c:${TYPES[e.type].color}"></span>
    <div class="grow"><span>${esc(e.note||TYPES[e.type].label)}</span><small>${e.date} · ${TYPES[e.type].label}${e.recurring?' · recurring':''}</small></div>
    <b>${e.type==='earning'?'+':'−'}${usd.format(e.amount)}</b><button class="del" data-id="${e.id}" aria-label="Delete">✕</button></li>`).join('')
    :'<li class="empty">No entries yet.</li>';
}

const hints={earning:'Weekly income: add each payday; it is grouped by week (Mon–Sun).',
 monthly:'Recurring: repeats every month from this date until deleted.',
 saving:'Money set aside this month.',daily:'Everyday spending such as food or transport.',
 unexpected:'One-off surprises: repairs, fines, medical bills.'};
const upd=()=>$('hint').textContent=hints[$('type').value];

$('form').addEventListener('submit',ev=>{
  ev.preventDefault();
  const amount=Math.round(parseFloat($('amount').value)*100)/100;
  if(!(amount>0)||!$('date').value)return;
  entries.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),type:$('type').value,amount,date:$('date').value,note:$('note').value.trim()});
  save();
  const d=parse($('date').value);view={y:d.getFullYear(),m:d.getMonth()};
  $('amount').value='';$('note').value='';render();
});
$('type').addEventListener('change',upd);
$('prev').onclick=()=>{view.m--;if(view.m<0){view.m=11;view.y--}render()};
$('next').onclick=()=>{view.m++;if(view.m>11){view.m=0;view.y++}render()};
$('tabs').addEventListener('click',e=>{if(e.target.dataset.t){filter=e.target.dataset.t;render()}});
$('list').addEventListener('click',e=>{const id=e.target.dataset.id;if(id){entries=entries.filter(x=>x.id!==id);save();render()}});
$('goal').addEventListener('change',e=>{goal=Math.max(0,Number(e.target.value)||0);store.set(GOAL_KEY,goal);render()});

function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('exportCsv').onclick=()=>{
  const q=s=>`"${String(s).replace(/"/g,'""')}"`;
  download('expenses.csv',['date,type,amount,note',...entries.map(e=>[e.date,e.type,e.amount.toFixed(2),q(e.note||'')].join(','))].join('\n'),'text/csv');
};
$('exportJson').onclick=()=>download('expense-backup.json',JSON.stringify({entries,goal},null,2),'application/json');
$('importJson').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const d=JSON.parse(await f.text());
    if(!Array.isArray(d.entries))throw 0;
    entries=d.entries.filter(x=>TYPES[x.type]&&x.amount>0&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)).map(x=>({id:String(x.id||Math.random().toString(36).slice(2)),type:x.type,amount:+x.amount,date:x.date,note:String(x.note||'').slice(0,80)}));
    goal=Number(d.goal)||0;store.set(GOAL_KEY,goal);save();render();
  }catch{alert('Invalid backup file.')}
  e.target.value='';
});
$('clearAll').onclick=()=>{if(confirm('Delete ALL entries? This cannot be undone.')){entries=[];save();render()}};

$('date').value=today;upd();render();
