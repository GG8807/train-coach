/* Train Coach. Where to change things:
   CFG   : data and image sources, XP amounts, rank names.
   tag() : how dataset exercises are sorted into movement type, equipment and injury flags.
   gen() : how a plan is built from your answers. */
const CFG={
 DATA:["exercises.json","https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"],
 IMG:"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/",
 XP:{session:50,beat:10,week:100},
 RANKS:[[1,"Rookie"],[5,"Regular"],[10,"Strong"],[15,"Elite"],[20,"Legend"]]
};
const $=id=>document.getElementById(id),K="trainCoach_v2",LV=["","Beginner","Intermediate","Advanced"];
let S={p:null,plan:null,logs:[]},X={},T={},view="plan",back="plan",D=null,E=null,rt=null,L={q:"",mu:"",eq:"",sw:null};
try{const j=localStorage.getItem(K);if(j)S=JSON.parse(j)}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};

/* ---------- exercise data ---------- */
async function load(){
 for(const u of CFG.DATA){try{const r=await fetch(u);if(r.ok){const a=await r.json();try{localStorage.setItem("tc_ex",JSON.stringify(a))}catch(e){}return a}}catch(e){}}
 try{const c=localStorage.getItem("tc_ex");if(c)return JSON.parse(c)}catch(e){}
 return null;
}
const INJ={shoulder:/overhead|shoulder press|military|dip|upright|behind|snatch|handstand|pike|arnold|fly|flye/,back:/deadlift|good morning|bent over|clean|snatch|jerk|hyperextension|superman/,knee:/squat|lunge|leg press|jump|step-up|pistol|sissy|leg extension|box/,wrist:/push-up|pushup|plank|handstand|dip|burpee|crawl/,neck:/neck|shrug|crunch|sit-up|situp|bicycle/};
function tag(x){
 const n=x.name.toLowerCase(),e=(x.equipment||"").toLowerCase(),m=(x.primaryMuscles||[])[0]||"";
 let p=null;
 if(x.category==="strength")p=m==="chest"||(m==="triceps"&&x.mechanic==="compound")?"PUSH":m==="shoulders"?"SH":m==="lats"||m==="middle back"?"PULL":m==="biceps"||m==="triceps"?"ARM":m==="quadriceps"?"SQ":m==="hamstrings"||m==="glutes"?"HIP":m==="abdominals"?"CORE":null;
 let eq={"body only":["bw"],dumbbell:["db"],bands:["band"],machine:["gym"],cable:["gym"],barbell:["gym"],"e-z curl bar":["gym"],kettlebells:["gym"]}[e];
 if(!eq)p=null;
 else if(e==="body only"&&/pull-?up|chin-?up|hanging|muscle-?up/.test(n))eq=["bar"];
 else if(e==="body only"&&/dip/.test(n))eq=["bench"];
 else if(e==="dumbbell"&&/bench|incline|decline/.test(n))eq=["db","bench"];
 return{id:x.id,n:x.name,p,eq:eq||[],v:{beginner:1,intermediate:2,expert:3}[x.level]||2,t:x.force==="static",c:x.mechanic==="compound",
  a:Object.keys(INJ).filter(k=>INJ[k].test(n)||(k==="shoulder"&&p==="SH")||(k==="back"&&m==="lower back")||(k==="knee"&&p==="SQ"))};
}
const haveOf=p=>{const h=new Set(["bw",...p.eq]);if(p.eq.includes("gym"))["db","band","bar","bench"].forEach(k=>h.add(k));return h};

/* ---------- plan generator ---------- */
function gen(p){
 const have=haveOf(p),pool=Object.values(T);
 let lv=p.cur;
 if(p.hist==="never")lv=1;else if(p.hist==="off")lv=Math.min(2,Math.max(p.cur,p.peak-1));
 let days=p.days;const note=[];
 if((lv===1||p.fat==="high")&&days>4){days=4;note.push("Capped at 4 sessions a week. At your level and workload, recovery matters more than extra volume.")}
 const N={30:4,45:5,60:6}[p.min]||5;
 const FB=["SQ","PUSH","PULL","HIP","CORE","ARM"],UP=["PUSH","PULL","SH","PULL","ARM","CORE"],LO=["SQ","HIP","SQ","HIP","CORE"],PU=["PUSH","SH","PUSH","ARM","CORE"],PL=["PULL","PULL","ARM","CORE"];
 let tpl;
 if(days<=3)tpl=Array.from({length:days},(_,i)=>["Full body "+"ABC"[i],FB]);
 else if(days===4)tpl=[["Upper A",UP],["Lower A",LO],["Upper B",UP],["Lower B",LO]];
 else tpl=Array.from({length:days},(_,i)=>[["Push","Pull","Legs"][i%3]+(i>2?" B":" A"),[PU,PL,LO][i%3]]);
 const rk={gym:0,db:1,bar:1,bench:1,band:2,bw:3},reps=p.goal==="muscle"?[8,12]:p.goal==="fat"?[12,15]:[10,12],bs=p.fat==="high"?2:3;
 const sessions=tpl.map(([name,pats],si)=>{
  const used=new Set();
  const ex=pats.slice(0,N).map(pt=>{
   let c=pool.filter(t=>t.p===pt&&t.eq.every(k=>have.has(k))&&!t.a.some(a=>p.inj.includes(a))&&!used.has(t.id));
   if(!c.length)return null;
   const f=c.filter(t=>t.v<=lv);
   if(f.length)c=f.sort((a,b)=>b.v-a.v||b.c-a.c||rk[a.eq[0]]-rk[b.eq[0]]||a.n.length-b.n.length);
   else c.sort((a,b)=>a.v-b.v||a.n.length-b.n.length);
   const t=c[si%Math.min(2,c.length)];
   used.add(t.id);
   const core=pt==="CORE",arm=pt==="ARM"||pt==="SH";
   const [lo,hi]=t.t?[30,45]:core?[12,15]:arm?[10,15]:reps;
   return{id:t.id,sets:core||arm?2:bs,lo,hi};
  }).filter(Boolean);
  return{name,ex};
 });
 return{sessions,lv,note,reps};
}

/* ---------- levels ---------- */
const xpTotal=()=>S.logs.reduce((a,l)=>a+(l.xp||0),0);
const lvl=xp=>{let l=1;while(xp>=50*l*(l+1))l++;return l};

/* ---------- screens ---------- */
const R=(n,o,v)=>o.map(([k,l])=>`<label class="chip"><input type="radio" name="${n}" value="${k}" ${String(k)===String(v)?"checked":""}><span>${l}</span></label>`).join("");
const C=(n,o,v)=>o.map(([k,l])=>`<label class="chip"><input type="checkbox" name="${n}" value="${k}" ${v.includes(k)?"checked":""}><span>${l}</span></label>`).join("");
function setup(){
 const p=S.p||{goal:"general",pu:0,sq:0,hist:"never",peak:1,inj:[],days:3,min:45,fat:"mid",eq:[]};
 return `<div class="card"><h3>Your goal</h3><p class="mu">Pick one. You can switch later, but chasing everything at once slows progress.</p>${R("goal",[["muscle","Build muscle"],["fat","Lose fat"],["general","General fitness (pick this if unsure)"]],p.goal)}</div>
<div class="card"><h3>Where you are now</h3><label class="f">Push-ups in a row, full form (0 if none)<input id="pu" type="number" inputmode="numeric" min="0" value="${p.pu}"></label><label class="f">Bodyweight squats in a row<input id="sq" type="number" inputmode="numeric" min="0" value="${p.sq}"></label></div>
<div class="card"><h3>Training history</h3>${R("hist",[["never","Never trained"],["off","Trained before, off 3+ months"],["on","Training regularly now"]],p.hist)}<p class="mu">At your best, you were:</p>${R("peak",[[1,"Beginner"],[2,"Intermediate"],[3,"Advanced"]],p.peak)}</div>
<div class="card"><h3>Pain or injuries</h3>${C("inj",[["shoulder","Shoulder"],["back","Lower back"],["knee","Knee"],["wrist","Wrist"],["neck","Neck"]],p.inj)}<p class="mu">Movements that load these areas are filtered out, but the filter is a rough guide. For a real injury, see a doctor first.</p></div>
<div class="card"><h3>Schedule</h3><p class="mu">Days per week</p>${R("days",[2,3,4,5,6].map(n=>[n,n]),p.days)}<p class="mu">Minutes per session</p>${R("min",[[30,"30"],[45,"45"],[60,"60"]],p.min)}<p class="mu">How tiring is your workday?</p>${R("fat",[["low","Light"],["mid","Moderate"],["high","Very tiring"]],p.fat)}</div>
<div class="card"><h3>Equipment</h3>${C("eq",[["db","Dumbbells"],["band","Resistance bands"],["bar","Pull-up bar"],["bench","Bench or sturdy box"],["gym","Gym membership (full gym)"]],p.eq)}<p class="mu">Bodyweight, a chair and a sturdy table are assumed.</p></div>
<button class="btn" onclick="build()">Build my plan</button>`;
}
const val=n=>(document.querySelector(`input[name=${n}]:checked`)||{}).value;
const vals=n=>[...document.querySelectorAll(`input[name=${n}]:checked`)].map(i=>i.value);
function build(){
 const pu=+$("pu").value||0,sq=+$("sq").value||0;
 const p={goal:val("goal"),pu,sq,cur:(pu<8||sq<15)?1:(pu>=20&&sq>=30)?3:2,hist:val("hist"),peak:+val("peak"),inj:vals("inj"),days:+val("days"),min:+val("min"),fat:val("fat"),eq:vals("eq")};
 S.p=p;S.plan=gen(p);save();view="plan";render();scrollTo(0,0);
}

function planV(){
 const pl=S.plan;if(!pl)return setup();
 const xp=xpTotal(),l=lvl(xp),a=50*(l-1)*l,b=50*l*(l+1),rank=CFG.RANKS.filter(r=>l>=r[0]).pop()[1];
 const wk=S.logs.filter(t=>Date.now()-t.t<6048e5).length,g={muscle:"Build muscle",fat:"Lose fat",general:"General fitness"}[S.p.goal];
 return `<div class="card"><h3>Level ${l}, ${rank}</h3><div class="bar"><i style="width:${Math.round((xp-a)/(b-a)*100)}%"></i></div><div class="mu">${xp-a} of ${b-a} XP to the next level</div><p class="mu">${LV[pl.lv]} plan, ${g}. Last 7 days: ${wk} of ${pl.sessions.length} sessions.</p>${pl.note.map(n=>`<p class="mu">${n}</p>`).join("")}</div>`+
 pl.sessions.map((s,i)=>`<div class="card"><h3>${s.name}</h3>${s.ex.map((e,k)=>{const x=X[e.id]||{name:e.id},t=T[e.id]||{};return `<div class="row"><span class="lnk" onclick="show('${e.id}')">${x.name}</span><span class="mu">${e.sets} × ${e.lo}–${e.hi}${t.t?" s":""}</span><button class="btn sm ghost" onclick="swap(${i},${k})">Swap</button></div>`}).join("")}<button class="btn" onclick="start(${i})">Start session</button></div>`).join("")+
 `<p class="mu">Leave a rest day between hard sessions. This is general guidance, not medical advice. Stop if you feel sharp pain.</p>`;
}

function start(i){D={si:i,sets:S.plan.sessions[i].ex.map(e=>Array.from({length:e.sets},()=>({w:"",r:""})))};view="work";render();scrollTo(0,0)}
function lastOf(id){for(let i=S.logs.length-1;i>=0;i--){const e=S.logs[i].ex.find(x=>x.id===id);if(e)return e}return null}
function workV(){
 const s=S.plan.sessions[D.si];
 return `<h2>${s.name}</h2>`+s.ex.map((e,ei)=>{
  const x=X[e.id]||{name:e.id},t=T[e.id]||{},l=lastOf(e.id);
  let tip="First time: pick a load or variation where the last rep is hard but your form stays clean.";
  if(l){const top=l.sets.every(q=>q.r>=e.hi);
   tip="Last time: "+l.sets.map(q=>(q.w?q.w+" kg × ":"")+q.r).join(", ")+". "+(top?(l.sets.some(q=>q.w>0)?"You hit the top of the range. Add 1–2 kg.":t.t?"Top of the range. Add 5–10 s or use a harder variation.":"Top of the range. Use a harder variation or slower reps."):"Beat last time with more reps before adding load.")}
  return `<div class="card"><h3 class="lnk" onclick="show('${e.id}')">${x.name}</h3><div class="mu">${e.sets} sets of ${e.lo}–${e.hi}${t.t?" seconds":" reps"}. Tap the name for pictures and steps.</div><div class="mu tip">${tip}</div>`+
  D.sets[ei].map((q,k)=>`<div class="set"><span>${k+1}</span><input type="number" inputmode="decimal" placeholder="kg" value="${q.w}" oninput="D.sets[${ei}][${k}].w=this.value"><input type="number" inputmode="numeric" placeholder="${t.t?"sec":"reps"}" value="${q.r}" oninput="D.sets[${ei}][${k}].r=this.value"><button class="btn sm ghost" onclick="rest()">Rest</button></div>`).join("")+`</div>`}).join("")+
  `<button class="btn" onclick="finish()">Finish workout</button><button class="btn ghost" onclick="view='plan';render()">Cancel</button>`;
}
function rest(){
 clearInterval(rt);let t=75;const b=$("rb");b.hidden=false;
 const u=()=>{if(t<=0){clearInterval(rt);b.textContent="Rest over. Start your next set.";try{navigator.vibrate(300)}catch(e){}setTimeout(()=>{b.hidden=true},4000);return}b.textContent="Rest "+t+" s (tap to skip)";t--};
 u();rt=setInterval(u,1000);
}
function finish(){
 const s=S.plan.sessions[D.si];
 const ex=s.ex.map((e,ei)=>({id:e.id,sets:D.sets[ei].map(q=>({w:+q.w||0,r:+q.r||0})).filter(q=>q.r>0)})).filter(e=>e.sets.length);
 if(!ex.length){alert("Log at least one set first.");return}
 const sc=e=>e.sets.reduce((a,q)=>a+Math.max(q.w,1)*q.r,0);
 let beat=0;ex.forEach(e=>{const l=lastOf(e.id);if(l&&sc(e)>sc(l))beat++});
 const day=new Date().toDateString(),same=S.logs.some(l=>new Date(l.t).toDateString()===day);
 let xp=same?0:CFG.XP.session+beat*CFG.XP.beat,wb=false;
 const wk=S.logs.filter(l=>Date.now()-l.t<6048e5);
 if(!same&&wk.length+1>=S.plan.sessions.length&&!wk.some(l=>l.wb)){xp+=CFG.XP.week;wb=true}
 const before=lvl(xpTotal());
 S.logs.push({t:Date.now(),name:s.name,ex,xp,wb});save();D=null;
 const after=lvl(xpTotal());
 view="hist";render();scrollTo(0,0);
 alert("+"+xp+" XP"+(after>before?"\nLevel up! You are now level "+after+".":"")+(same?"\nOnly the first session each day earns XP. This one is still saved in your history.":""));
}

/* ---------- library, details, swap ---------- */
function libV(){
 const A=Object.values(X),mus=[...new Set(A.flatMap(x=>x.primaryMuscles||[]))].sort(),eqs=[...new Set(A.map(x=>x.equipment||"none"))].sort();
 const o=(a,v)=>`<option value="">All</option>`+a.map(k=>`<option ${k===v?"selected":""}>${k}</option>`).join("");
 return `<h2>${L.sw?"Swap exercise":"Exercise library"}</h2><div class="card"><input id="q" aria-label="Search" placeholder="Search ${A.length} exercises" value="${L.q.replace(/"/g,"&quot;")}" oninput="L.q=this.value;list()"><select aria-label="Muscle" onchange="L.mu=this.value;list()">${o(mus,L.mu)}</select><select aria-label="Equipment" onchange="L.eq=this.value;list()">${o(eqs,L.eq)}</select>${L.sw?`<p class="mu">Showing exercises of the same movement type that fit your equipment.</p>`:""}</div><div id="res"></div>`+(L.sw?`<button class="btn ghost" onclick="L.sw=null;view='plan';render()">Cancel</button>`:"");
}
function list(){
 const q=L.q.toLowerCase();
 let a=Object.values(X).filter(x=>(!q||x.name.toLowerCase().includes(q))&&(!L.mu||(x.primaryMuscles||[]).includes(L.mu))&&(!L.eq||(x.equipment||"none")===L.eq));
 if(L.sw){const t0=T[L.sw.id],h=haveOf(S.p);a=a.filter(x=>{const t=T[x.id];return t.p&&t.p===t0.p&&t.eq.every(k=>h.has(k))&&x.id!==L.sw.id})}
 $("res").innerHTML=(a.length?a.slice(0,60).map(x=>`<div class="card row2"><div onclick="show('${x.id}')"><b>${x.name}</b><div class="mu">${(x.primaryMuscles||[]).join(", ")}, ${x.equipment||"no equipment"}, ${x.level}</div></div>${L.sw?`<button class="btn sm" onclick="use('${x.id}')">Use</button>`:""}</div>`).join(""):`<p class="mu">No matches.</p>`)+(a.length>60?`<p class="mu">Showing 60 of ${a.length}. Narrow your search.</p>`:"");
}
function show(id){E=id;back=view;view="ex";render();scrollTo(0,0)}
function exV(){
 const x=X[E],sec=(x.secondaryMuscles||[]).length?" (also "+x.secondaryMuscles.join(", ")+")":"";
 return `<h2>${x.name}</h2><div class="mu">${(x.primaryMuscles||[]).join(", ")}${sec}, ${x.equipment||"no equipment"}, ${x.level}</div><div class="imgs">${(x.images||[]).map(i=>`<img loading="lazy" alt="${x.name} demonstration" src="${CFG.IMG+i}">`).join("")}</div><div class="card"><h3>How to do it</h3><ol>${(x.instructions||[]).map(s=>`<li>${s}</li>`).join("")}</ol></div><button class="btn" onclick="view=back;render()">Back</button>`;
}
function swap(si,ei){L={q:"",mu:"",eq:"",sw:{si,ei,id:S.plan.sessions[si].ex[ei].id}};view="lib";render();scrollTo(0,0)}
function use(id){
 const {si,ei}=L.sw,e=S.plan.sessions[si].ex[ei],old=T[e.id]||{},t=T[id];
 e.id=id;
 if(t.t){e.lo=30;e.hi=45}else if(old.t){e.lo=S.plan.reps[0];e.hi=S.plan.reps[1]}
 save();L.sw=null;view="plan";render();scrollTo(0,0);
}

/* ---------- history, backup ---------- */
function histV(){
 const A=[...S.logs].reverse();
 return `<h2>History</h2>`+(A.length?A.map(l=>{const n=l.ex.reduce((a,e)=>a+e.sets.length,0),vol=l.ex.reduce((a,e)=>a+e.sets.reduce((b,q)=>b+q.w*q.r,0),0);return `<div class="card"><h3>${l.name}</h3><div class="mu">${new Date(l.t).toLocaleDateString()}: ${n} sets, ${Math.round(vol)} kg total volume, +${l.xp||0} XP</div></div>`}).join(""):`<p class="mu">No sessions logged yet. Finish a workout and it shows up here.</p>`);
}
function dataV(){
 const j=JSON.stringify(S).replace(/&/g,"&amp;").replace(/</g,"&lt;");
 return `<h2>Backup</h2><p class="mu">Your progress lives only in this browser. Save a backup file now and then. You can also copy the text below and paste it back to restore.</p><button class="btn" onclick="exp()">Save backup file</button><textarea id="bk" rows="6">${j}</textarea><button class="btn" onclick="restore()">Restore from text</button><button class="btn ghost" onclick="view='setup';render()">Edit profile and rebuild plan</button>`;
}
function exp(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:"application/json"}));a.download="train-coach-backup.json";a.click()}
function restore(){try{const o=JSON.parse($("bk").value);if(o&&Array.isArray(o.logs)){S=o;save();view=S.plan?"plan":"setup";render()}else alert("That text is not a valid backup.")}catch(e){alert("That text is not a valid backup.")}}

/* ---------- shell ---------- */
function go(k){if(k==="lib")L={q:"",mu:"",eq:"",sw:null};view=k;render()}
function render(){
 const nav=[["plan","Plan"],["lib","Library"],["hist","History"],["data","Backup"]];
 $("app").innerHTML=`<div class="wrap"><h1>Train Coach</h1>`+(view==="work"||view==="ex"?"":`<nav>${nav.map(([k,l])=>`<button class="tab ${view===k?"on":""}" onclick="go('${k}')">${l}</button>`).join("")}</nav>`)+({plan:planV,setup,work:workV,hist:histV,data:dataV,lib:libV,ex:exV}[view])()+`</div>`;
 if(view==="lib")list();
}
load().then(a=>{
 if(!a){$("app").innerHTML=`<div class="wrap"><h1>Train Coach</h1><div class="card">Could not load the exercise list. Check your connection and reload the page.</div></div>`;return}
 a.forEach(x=>{X[x.id]=x;T[x.id]=tag(x)});
 if(!S.plan)view="setup";
 render();
});
