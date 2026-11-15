// Safety: ensure getElementById never returns undefined
;(function(){
 try{
 var _orig=document.getElementById.bind(document);
 document.getElementById=function(id){
 try{var r=_orig(id);return r||null}catch(e){return null}
 };
 }catch(e){}
})();
/* TEMA */
const htmlEl=document.documentElement
const themeToggle=document.getElementById('theme-toggle')
const themeIcon=document.getElementById('theme-icon')
function applyTheme(t){htmlEl.setAttribute('data-theme',t);themeIcon.textContent=t==='dark'?'☀️':'🌙';localStorage.setItem('sf-theme',t)}
if(themeToggle)themeToggle.addEventListener('click',()=>applyTheme(htmlEl.getAttribute('data-theme')==='dark'?'light':'dark'))
const saved=localStorage.getItem('sf-theme');if(saved)applyTheme(saved);else applyTheme('light')

/* SCROLL REVEAL */
const ro=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');ro.unobserve(e.target)}}),{threshold:.1})
document.querySelectorAll('.reveal').forEach(el=>ro.observe(el))
setTimeout(()=>document.querySelectorAll('.reveal:not(.visible)').forEach(el=>el.classList.add('visible')),400)

/* DRAWER */
const hamburger=document.getElementById('hamburger')
const drawer=document.getElementById('drawer')
const drawerOverlay=document.getElementById('drawer-overlay')
function openDrawer(){
 const sy=window.scrollY;
 document.body.style.top='-'+sy+'px';
 document.body.classList.add('scroll-locked');
 drawer.classList.add('open');drawerOverlay.classList.add('open');hamburger.classList.add('open');
}
function closeDrawer(){
 const sy=parseFloat(document.body.style.top||'0')*-1;
 document.body.classList.remove('scroll-locked');
 document.body.style.top='';
 window.scrollTo({top:sy,behavior:'instant'});
 drawer.classList.remove('open');drawerOverlay.classList.remove('open');hamburger.classList.remove('open');
}
if(hamburger)hamburger.addEventListener('click',()=>drawer.classList.contains('open')?closeDrawer():openDrawer())
if(drawerOverlay)drawerOverlay.addEventListener('click',closeDrawer)
const elDC=document.getElementById('drawer-close');if(elDC)elDC.addEventListener('click',closeDrawer)

/* PLANOS MODAL */
function openPlanosModal(){
 const overlay=document.getElementById('planos-modal-overlay')
 if(overlay){overlay.scrollTop=0;const body=overlay.querySelector('.planos-modal-body');if(body)body.scrollTop=0}
 openModal('planos-modal-overlay')
 setTimeout(()=>{
  document.querySelectorAll('#planos-modal-overlay .reveal').forEach(el=>el.classList.add('visible'))
 },80)
}
document.getElementById('planos-modal-close')?.addEventListener('click',()=>closeModal('planos-modal-overlay'))


let _jspdfPromise = null;
function loadJSPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  if (_jspdfPromise) return _jspdfPromise;
  _jspdfPromise = new Promise((resolve, reject) => {
    showToast('Baixando gerador de PDF...', 'info');
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => { resolve(window.jspdf); };
    s.onerror = () => { showToast('Erro ao carregar gerador de PDF.', 'error'); reject(); };
    document.head.appendChild(s);
  });
  return _jspdfPromise;
}

/* MODAIS - open/close */
function openModal(id){
 const el=document.getElementById(id)
 if(el){el.classList.add('open');document.body.style.overflow='hidden';const inp=el.querySelector('input');if(inp)setTimeout(()=>inp.focus(),300)}
}
function closeModal(id){
 const el=document.getElementById(id)
 if(el){el.classList.remove('open');document.body.style.overflow=''}
}

// Wire up drawer buttons
document.getElementById('drawer-imc-btn')?.addEventListener('click',()=>{closeDrawer();openModal('imc-modal-overlay')})
document.getElementById('drawer-cal-btn')?.addEventListener('click',()=>{closeDrawer();openModal('cal-modal-overlay')})
document.getElementById('drawer-agua-btn')?.addEventListener('click',()=>{closeDrawer();openModal('agua-modal-overlay')})
document.getElementById('drawer-macro-btn')?.addEventListener('click',()=>{closeDrawer();openModal('macro-modal-overlay')})
document.getElementById('drawer-sim-btn')?.addEventListener('click',()=>{closeDrawer();openModal('sim-modal-overlay')})

// Close buttons
document.getElementById('modal-close')?.addEventListener('click',()=>closeModal('imc-modal-overlay'))
document.getElementById('cal-modal-close')?.addEventListener('click',()=>closeModal('cal-modal-overlay'))
document.getElementById('agua-modal-close')?.addEventListener('click',()=>closeModal('agua-modal-overlay'))
document.getElementById('macro-modal-close')?.addEventListener('click',()=>closeModal('macro-modal-overlay'))
document.getElementById('sim-modal-close')?.addEventListener('click',()=>closeModal('sim-modal-overlay'))
document.getElementById('drawer-rm-btn')?.addEventListener('click',()=>{closeDrawer();openModal('rm-modal-overlay')})
document.getElementById('rm-modal-close')?.addEventListener('click',()=>closeModal('rm-modal-overlay'))
// Input Validation
document.addEventListener('input', function(e) {
  if (e.target && e.target.type === 'number') {
    if (e.target.value && parseFloat(e.target.value) < 0) {
      e.target.value = Math.abs(parseFloat(e.target.value));
    }
  }
});

// Click outside
;(function(){
 try{
 var _overlays=['imc-modal-overlay','cal-modal-overlay','agua-modal-overlay','macro-modal-overlay','sim-modal-overlay','rm-modal-overlay','alarm-modal-overlay','planos-modal-overlay'];
 _overlays.forEach(function(oid){
 try{
 var el=document.getElementById(oid);
 if(!el||typeof el.addEventListener!=='function')return;
 el.addEventListener('click',function(e){
 try{if(e&&e.target&&typeof e.target.id!=='undefined'&&e.target.id===oid)closeModal(oid)}catch(err){}
 });
 }catch(err){}
 });
 }catch(err){}
})();
document.addEventListener('keydown',function(e){try{if(e.key==='Escape'){['imc-modal-overlay','cal-modal-overlay','agua-modal-overlay','macro-modal-overlay','sim-modal-overlay','rm-modal-overlay','alarm-modal-overlay','planos-modal-overlay'].forEach(function(id){try{closeModal(id)}catch(err){}});try{endTutorial()}catch(err){}}}catch(err){}})

/* SEX TOGGLES */
let modalSex='m', calSex='m'
function setModalSex(s){modalSex=s;document.getElementById('modal-sex-m').classList.toggle('active',s==='m');document.getElementById('modal-sex-f').classList.toggle('active',s==='f')}
function setCalSex(s){calSex=s;document.getElementById('calsex-m').classList.toggle('active',s==='m');document.getElementById('calsex-f').classList.toggle('active',s==='f')}

/* OPTION GROUPS */
function makeGroup(groupId,cls='.agua-opt'){
 const btns=document.querySelectorAll(`#${groupId} ${cls}`)
 btns.forEach(b=>b.addEventListener('click',()=>{btns.forEach(x=>x.classList.remove('active'));b.classList.add('active')}))
}
function getGroupVal(groupId,cls='.agua-opt'){return document.querySelector(`#${groupId} ${cls}.active`)?.dataset.val}

makeGroup('agua-ativ');makeGroup('agua-clima');makeGroup('agua-obj')
makeGroup('macro-sexo','.macro-opt');makeGroup('macro-ativ','.macro-opt');makeGroup('macro-obj','.macro-opt');makeGroup('macro-dieta','.macro-tab')
makeGroup('sim-sexo','.sim-opt');makeGroup('sim-ativ','.sim-opt');makeGroup('sim-obj','.sim-opt')

/* SLIDER LABELS */
document.getElementById('sim-treino')?.addEventListener('input',function(){document.getElementById('sim-treino-val').textContent=this.value})
document.getElementById('sim-meta')?.addEventListener('input',function(){document.getElementById('sim-meta-val').textContent=this.value})

/* IMC RANGES */
const RANGES=[
 {min:0, max:18.49,label:'Abaixo do peso', short:'Abaixo', color:'#60a5fa',icon:'',msg:'Você está abaixo do peso ideal. Busque orientação médica e nutricional.',tip:'Aumente a ingestão calórica com alimentos nutritivos e pratique exercícios de força.'},
 {min:18.5,max:24.99,label:'Peso normal', short:'Normal', color:'#4ade80',icon:'',msg:'Parabéns! Você está na faixa saudável segundo a OMS. Mantenha hábitos equilibrados.',tip:'Continue com alimentação balanceada e exercícios regulares.'},
 {min:25, max:29.99,label:'Sobrepeso', short:'Sobrepeso',color:'#facc15',icon:'!',msg:'Você está em sobrepeso. Treinos regulares e alimentação balanceada são fundamentais.',tip:'Combine musculação com cardio 3-5x por semana e reduza açúcares.'},
 {min:30, max:34.99,label:'Obesidade I', short:'Obese. I', color:'#fb923c',icon:'!',msg:'Obesidade grau I. Adote mudanças no estilo de vida com acompanhamento profissional.',tip:'Busque orientação médica. Inicie com atividades leves como caminhada.'},
 {min:35, max:39.99,label:'Obesidade II', short:'Obese. II',color:'#f87171',icon:'!',msg:'Obesidade grau II. O acompanhamento médico é essencial.',tip:'Procure imediatamente um médico especialista.'},
 {min:40, max:Infinity,label:'Obesidade III',short:'Obese III',color:'#f43f5e',icon:'!',msg:'Obesidade grau III. Busque atendimento médico especializado urgentemente.',tip:'Consulte urgentemente um médico especialista.'},
]
function gaugePct(v){const segW=100/RANGES.length;for(let i=0;i<RANGES.length;i++){const r=RANGES[i],rMax=r.max===Infinity?45:r.max;if(v>=r.min&&v<=rMax){const w=(rMax===r.min)?0.5:Math.min((v-r.min)/(rMax-r.min),1);return i*segW+w*segW}}return v<18.5?0:100}
function pesoIdeal(h){return{mn:Math.round(18.5*(h/100)**2*10)/10,mx:Math.round(24.9*(h/100)**2*10)/10}}
function calcTMB(p,h,id,sx){return sx==='m'?Math.round(10*p+6.25*h-5*id+5):Math.round(10*p+6.25*h-5*id-161)}

function imcResultHTML(imc,peso,altura,idade,sexo){
 const r=RANGES.find(x=>imc>=x.min&&imc<=x.max)||RANGES[RANGES.length-1]
 const pi=pesoIdeal(altura)
 const tmb=calcTMB(peso,altura,idade,sexo)
 const pct=gaugePct(imc)
 const id='res'+Date.now()
 return {r,pi,tmb,id,html:`<div>
 <div class="res-hdr">
 <span class="res-icon">${r.icon}</span>
 <div><div class="res-lbl-sm">SEU IMC</div><div class="res-val" style="color:${r.color}">${imc.toFixed(2)}</div></div>
 <span class="res-badge" style="background:${r.color}">${r.label}</span>
 </div>
 <div class="gauge-wrap">
 <div class="gauge-bar">${RANGES.map(s=>`<div class="gseg" style="background:${s.color}"></div>`).join('')}
 <div class="gneedle" style="left:${pct}%"><div class="gndl-line"></div><div class="gndl-dot" style="background:${r.color}"></div></div>
 </div>
 <div class="gauge-lbls">${RANGES.map(s=>`<div class="glbl"><span class="glbl-txt" style="color:${s.color};${s.label===r.label?'font-weight:800;font-size:9px':''}">${s.short}</span></div>`).join('')}</div>
 </div>
 <div class="res-stats-row">
 <div class="res-stat"><div class="res-stat-lbl">Mín. ideal</div><div class="res-stat-val">${pi.mn}<span class="res-stat-unit"> kg</span></div></div>
 <div class="res-stat"><div class="res-stat-lbl">Máx. ideal</div><div class="res-stat-val">${pi.mx}<span class="res-stat-unit"> kg</span></div></div>
 <div class="res-stat"><div class="res-stat-lbl">TMB</div><div class="res-stat-val">${tmb}<span class="res-stat-unit"> kcal</span></div></div>
 </div>
 <div class="res-msg">${r.msg}</div>
 <div style="font-size:12px;color:var(--mt);background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;line-height:1.6"> ${r.tip}</div>
 <button class="btn-pdf-single" id="bp-${id}"> Baixar Relatório PDF</button>
 </div>`}
}

/* IMC FORM */
function setupIMC(){
 const calc=()=>{
 const peso=parseFloat(document.getElementById('inp-peso').value)
 const alt=parseFloat(document.getElementById('inp-alt').value)
 const idade=parseFloat(document.getElementById('inp-idade-modal').value)
 const errBox=document.getElementById('imc-err'),errTxt=document.getElementById('imc-err-txt')
 if(errBox)errBox.style.display='none'
 if(!peso||peso<1||peso>500){if(errTxt)errTxt.textContent='Peso inválido.';if(errBox)errBox.style.display='flex';const inp=document.getElementById('inp-peso');if(inp){inp.classList.add('err');setTimeout(()=>inp.classList.remove('err'),500)}return}
 if(!alt||alt<50||alt>250){if(errTxt)errTxt.textContent='Altura inválida (em cm).';if(errBox)errBox.style.display='flex';return}
 if(!idade||idade<10||idade>110){if(errTxt)errTxt.textContent='Idade inválida.';if(errBox)errBox.style.display='flex';return}
 const imc=peso/((alt/100)**2)
 const{r,pi,tmb,id,html}=imcResultHTML(imc,peso,alt,idade,modalSex)
 const res=document.getElementById('imc-result')
 res.style.borderColor='rgba('+{ok:'74,222,128',warn:'250,204,21',alert:'248,113,113',info:'0,102,255'}[r.color==='#4ade80'?'ok':r.color==='#facc15'?'warn':r.color==='#60a5fa'?'info':'alert']+', .35)'
 res.style.background='rgba('+{ok:'74,222,128',warn:'250,204,21',alert:'248,113,113',info:'0,102,255'}[r.color==='#4ade80'?'ok':r.color==='#facc15'?'warn':r.color==='#60a5fa'?'info':'alert']+', .06)'
 res.classList.remove('show');void res.offsetWidth;res.classList.add('show');res.innerHTML=html
 setTimeout(()=>{document.getElementById(`bp-${id}`)?.addEventListener('click',()=>generatePDF({peso,altura:alt,imc,range:r,pesoIdeal:pi,tmb,sexo:modalSex,idade}));res.scrollIntoView({behavior:'smooth',block:'nearest'})},60)
 }
 document.getElementById('btn-calc')?.addEventListener('click',calc)
 document.getElementById('btn-clr')?.addEventListener('click',()=>{['inp-peso','inp-alt','inp-idade-modal'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});document.getElementById('imc-err').style.display='none';const r=document.getElementById('imc-result');r.classList.remove('show');r.innerHTML=''})
 document.getElementById('inp-alt')?.addEventListener('keydown',e=>{if(e.key==='Enter')calc()})
 document.getElementById('inp-idade-modal')?.addEventListener('keydown',e=>{if(e.key==='Enter')calc()})
}
try{setupIMC()}catch(e){console.error("setupIMC error:",e)}

/* CALORIAS FORM */
function calorieHTML(tmb){
 const niveis=[
 {l:'Sedentário',sub:'Sem exercício',f:1.2,c:'#60a5fa'},
 {l:'Levemente ativo',sub:'1–3x/sem.',f:1.375,c:'#60a5fa'},
 {l:'Moderado',sub:'3–5x/sem.',f:1.55,c:'#93c5fd'},
 {l:'Muito ativo',sub:'6–7x/sem.',f:1.725,c:'#bfdbfe'},
 ]
 return `<div class="calorie-result-wrap">
 <div class="calorie-tmb-row"><span class="calorie-tmb-label">TMB</span><span class="calorie-tmb-val">${tmb}<small> kcal/dia</small></span></div>
 <div class="calorie-cards-grid">${niveis.map(n=>{const tdee=Math.round(tmb*n.f);return`<div class="calorie-card" style="--cc:${n.c}"><div class="calorie-card-lbl">${n.l}</div><div class="calorie-card-sub">${n.sub}</div><div class="calorie-card-val">${tdee}<small>kcal</small></div></div>`}).join('')}</div>
 <div class="calorie-hb-note">* Mifflin-St Jeor. Consulte um nutricionista.</div>
 </div><button class="btn-pdf-single" style="margin-top:8px" onclick="gerarPDFCalorias(${tmb},0,0,0,'${calSex}')"> Baixar PDF</button>`
}
function setupCalorias(){
 const calc=()=>{
 const peso=parseFloat(document.getElementById('cal-peso').value)
 const alt=parseFloat(document.getElementById('cal-alt').value)
 const idade=parseFloat(document.getElementById('cal-idade').value)
 const errBox=document.getElementById('cal-err'),errTxt=document.getElementById('cal-err-txt')
 if(errBox)errBox.style.display='none'
 if(!peso||peso<1||peso>500){if(errTxt)errTxt.textContent='Peso inválido.';if(errBox)errBox.style.display='flex';return}
 if(!alt||alt<50||alt>250){if(errTxt)errTxt.textContent='Altura inválida (cm).';if(errBox)errBox.style.display='flex';return}
 if(!idade||idade<10||idade>110){if(errTxt)errTxt.textContent='Idade inválida.';if(errBox)errBox.style.display='flex';return}
 const tmb=calcTMB(peso,alt,idade,calSex)
 const res=document.getElementById('cal-result')
 res.style.borderColor='rgba(61,154,255,.35)';res.style.background='rgba(0,102,255,.06)'
 res.classList.remove('show');void res.offsetWidth;res.classList.add('show')
 res.innerHTML=calorieHTML(tmb)
 setTimeout(()=>res.scrollIntoView({behavior:'smooth',block:'nearest'}),60)
 }
 document.getElementById('cal-calc-btn')?.addEventListener('click',calc)
 document.getElementById('cal-clr-btn')?.addEventListener('click',()=>{['cal-peso','cal-alt','cal-idade'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});document.getElementById('cal-err').style.display='none';const r=document.getElementById('cal-result');r.classList.remove('show');r.innerHTML=''})
}
try{setupCalorias()}catch(e){console.error("setupCalorias error:",e)}

/* AGUA */
let _lastAguaData=null
function setupAgua(){
 const calc=()=>{
 const peso=parseFloat(document.getElementById('agua-peso').value)
 const errBox=document.getElementById('agua-err'),errTxt=document.getElementById('agua-err-txt')
 if(errBox)errBox.style.display='none'
 if(!peso||peso<20||peso>300){if(errTxt)errTxt.textContent='Informe peso entre 20–300 kg.';if(errBox)errBox.style.display='flex';return}
 const ativ=getGroupVal('agua-ativ'),clima=getGroupVal('agua-clima'),obj=getGroupVal('agua-obj')
 let ml=peso*35
 if(ativ==='mod')ml*=1.10;else if(ativ==='int')ml*=1.20
 if(clima==='qnte')ml*=1.10;else if(clima==='frio')ml*=0.95
 if(obj==='perf')ml*=1.10;else if(obj==='emag')ml*=1.05
 ml=Math.round(ml/50)*50
 const litros=(ml/1000).toFixed(1),copos=Math.round(ml/200)
 const manha=Math.round(ml*.35/50)*50,tarde=Math.round(ml*.40/50)*50,noite=ml-manha-tarde
 _lastAguaData={peso,ml,litros:parseFloat(litros),copos,manha,tarde,noite,ativ,clima,obj}
 const shareText=encodeURIComponent(`Minha meta de água: ${litros}L/dia \nStudio Focus - Garça SP\n(14) 98218-0923`)
 const res=document.getElementById('agua-result')
 res.style.borderColor='rgba(96,165,250,.35)';res.style.background='rgba(96,165,250,.06)'
 res.classList.remove('show');void res.offsetWidth;res.classList.add('show')
 res.innerHTML=`
 <div class="agua-result-main">
 <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#93c5fd;margin-bottom:4px">Sua meta diária</div>
 <div class="agua-liters">${litros}<span>L/dia</span></div>
 <div class="agua-copos"> ${copos} copos <small>de 200ml</small></div>
 </div>
 <div>
 <div style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--pu2);margin-bottom:8px"> Distribuição no dia</div>
 <div class="agua-schedule">
 <div class="agua-period"><div class="agua-period-icon">AM</div><div class="agua-period-label">Manhã</div><div class="agua-period-ml">${(manha/1000).toFixed(1)}<small>L</small></div><div class="agua-period-cups">${Math.round(manha/200)} copos</div></div>
 <div class="agua-period"><div class="agua-period-icon">PM</div><div class="agua-period-label">Tarde</div><div class="agua-period-ml">${(tarde/1000).toFixed(1)}<small>L</small></div><div class="agua-period-cups">${Math.round(tarde/200)} copos</div></div>
 <div class="agua-period"><div class="agua-period-icon">NI</div><div class="agua-period-label">Noite</div><div class="agua-period-ml">${(noite/1000).toFixed(1)}<small>L</small></div><div class="agua-period-cups">${Math.round(noite/200)} copos</div></div>
 </div>
 </div>
 <div class="agua-tips">
 ${ativ==='int'?'<div class="agua-tip"><span class="agua-tip-icon">›</span><span>Treino intenso: beba 500ml extras nos dias de treino.</span></div>':''}
 ${clima==='qnte'?'<div class="agua-tip"><span class="agua-tip-icon">›</span><span>Clima quente: tenha sempre uma garrafinha à mão.</span></div>':''}
 <div class="agua-tip"><span class="agua-tip-icon">›</span><span>Distribua ao longo do dia. Evite beber tudo de uma vez.</span></div>
 </div>
 <div style="display:flex;gap:8px">
 <button class="agua-share-btn" style="flex:1" onclick="aguaShare('${shareText}')">Compartilhar</button>
 <button class="agua-share-btn" style="flex:1;background:linear-gradient(135deg,#16a34a,#22c55e)" onclick="gerarPDFAgua()"> PDF</button>
 </div>
 <div class="agua-warn"> Valores estimados. Consulte um nutricionista.</div>`
 setTimeout(()=>res.scrollIntoView({behavior:'smooth',block:'nearest'}),60)
 }
 document.getElementById('agua-calc-btn')?.addEventListener('click',calc)
 document.getElementById('agua-clr-btn')?.addEventListener('click',()=>{document.getElementById('agua-peso').value='';document.getElementById('agua-err').style.display='none';const r=document.getElementById('agua-result');r.classList.remove('show');r.innerHTML=''})
}
try{setupAgua()}catch(e){console.error("setupAgua error:",e)}
function aguaShare(text){if(navigator.share){navigator.share({title:'Hidratação - Studio Focus',text:decodeURIComponent(text)}).catch(()=>{})}else{window.open('https://wa.me/?text='+text,'_blank')}}

/* MACROS */
let _lastMacroData=null
function setupMacros(){
 const calc=()=>{
 const peso=parseFloat(document.getElementById('macro-peso').value)
 const alt=parseFloat(document.getElementById('macro-alt').value)
 const idade=parseFloat(document.getElementById('macro-idade').value)
 const errBox=document.getElementById('macro-err'),errTxt=document.getElementById('macro-err-txt')
 if(errBox)errBox.style.display='none'
 if(!peso||peso<20||peso>300){if(errTxt)errTxt.textContent='Peso inválido.';if(errBox)errBox.style.display='flex';return}
 if(!alt||alt<100||alt>250){if(errTxt)errTxt.textContent='Altura inválida (cm).';if(errBox)errBox.style.display='flex';return}
 if(!idade||idade<10||idade>110){if(errTxt)errTxt.textContent='Idade inválida.';if(errBox)errBox.style.display='flex';return}
 const sexo=getGroupVal('macro-sexo','.macro-opt')
 const ativ=getGroupVal('macro-ativ','.macro-opt')
 const obj=getGroupVal('macro-obj','.macro-opt')
 const dieta=getGroupVal('macro-dieta','.macro-tab')
 const tmb=calcTMB(peso,alt,idade,sexo)
 const fatores={sed:1.2,mod:1.55,ati:1.725}
 const tdee=Math.round(tmb*fatores[ativ])
 let meta=obj==='emag'?tdee-400:obj==='mass'?tdee+400:tdee
 const protG=Math.round((obj==='emag'?2.0:obj==='mass'?2.0:1.8)*peso)
 let gordG=Math.round(0.9*peso)
 let carbG=Math.max(50,Math.round((meta-protG*4-gordG*9)/4))
 if(dieta==='lowc'){carbG=Math.min(carbG,100)}
 const totalKcal=protG*4+carbG*4+gordG*9
 const protPct=Math.round((protG*4/totalKcal)*100),carbPct=Math.round((carbG*4/totalKcal)*100),gordPct=100-protPct-carbPct
 const objLabel={emag:'Emagrecimento (−400 kcal)',mant:'Manutenção',mass:'Ganho de Massa (+400 kcal)'}
 const dietaLabel={pad:'Padrão',lowc:'Low Carb',highc:'High Carb'}
 _lastMacroData={totalKcal,protG,carbG,gordFinalG:gordG,protPct,carbPct,gordPct,objKey:obj,objLabel:objLabel[obj],dietaLabel:dietaLabel[dieta],tmb:String(tmb),tdee:String(tdee),peso}
 const res=document.getElementById('macro-result')
 res.style.borderColor='rgba(61,154,255,.35)';res.style.background='rgba(0,102,255,.07)'
 res.classList.remove('show');void res.offsetWidth;res.classList.add('show')
 res.innerHTML=`
 <div class="macro-kcal-banner">
 <div class="macro-kcal-main">
 <div class="macro-kcal-label">Meta calórica diária</div>
 <div class="macro-kcal-num">${totalKcal}<span style="font-size:16px;font-family:var(--fb);color:var(--mt);font-weight:300"> kcal</span></div>
 <div style="font-size:11px;color:var(--pu2);margin-top:2px">${objLabel[obj]}</div>
 </div>
 <div class="macro-kcal-side">TMB: <strong style="color:var(--tx)">${tmb}</strong><br>TDEE: <strong style="color:var(--tx)">${tdee}</strong><br>Dieta: <strong style="color:var(--pu2)">${dietaLabel[dieta]}</strong></div>
 </div>
 <div class="macro-pie-row">
 <div class="macro-pie-item"><div class="macro-pie-dot" style="background:#60a5fa"></div><div class="macro-pie-val" style="color:#60a5fa">${protG}g</div><div class="macro-pie-lbl">Proteína</div><div class="macro-pie-kcal">${protPct}%</div></div>
 <div class="macro-pie-item"><div class="macro-pie-dot" style="background:#facc15"></div><div class="macro-pie-val" style="color:#facc15">${carbG}g</div><div class="macro-pie-lbl">Carbo</div><div class="macro-pie-kcal">${carbPct}%</div></div>
 <div class="macro-pie-item"><div class="macro-pie-dot" style="background:#f97316"></div><div class="macro-pie-val" style="color:#f97316">${gordG}g</div><div class="macro-pie-lbl">Gordura</div><div class="macro-pie-kcal">${gordPct}%</div></div>
 </div>
 <div class="macro-bars">
 ${macroBar('Proteínas','#60a5fa',protG,'g',protPct,protG*4+' kcal')}
 ${macroBar('Carboidratos','#facc15',carbG,'g',carbPct,carbG*4+' kcal')}
 ${macroBar('Gorduras','#f97316',gordG,'g',gordPct,gordG*9+' kcal')}
 </div>
 <div class="macro-action-row">
 <button class="macro-action-btn" style="background:var(--pu);color:#fff" onclick="calcMacros()">Recalcular</button>
 <button class="macro-action-btn" style="background:var(--gr);color:#fff" onclick="gerarPDFMacros()"> PDF</button>
 </div>
 <div class="macro-warn"> Valores estimados. Consulte um nutricionista.</div>`
 setTimeout(()=>res.scrollIntoView({behavior:'smooth',block:'nearest'}),60)
 }
 document.getElementById('macro-calc-btn')?.addEventListener('click',calc)
 document.getElementById('macro-clr-btn')?.addEventListener('click',()=>{['macro-peso','macro-alt','macro-idade'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});document.getElementById('macro-err').style.display='none';const r=document.getElementById('macro-result');r.classList.remove('show');r.innerHTML=''})
}
function calcMacros(){document.getElementById('macro-calc-btn')?.click()}
try{setupMacros()}catch(e){console.error("setupMacros error:",e)}
function macroBar(nome,cor,val,unit,pct,sub){
 return`<div class="macro-bar-row">
 <div class="macro-bar-top"><span class="macro-bar-name" style="color:${cor}">${nome}</span><span class="macro-bar-g" style="color:${cor}">${val}<span style="font-size:12px;font-family:var(--fb);color:var(--mt)"> ${unit}</span></span></div>
 <div class="macro-bar-bg"><div class="macro-bar-fill" style="width:${pct}%;background:${cor}"></div></div>
 <div style="display:flex;justify-content:space-between"><span class="macro-bar-pct">${pct}%</span><span class="macro-bar-kcal">${sub}</span></div>
 </div>`
}

/* SIMULADOR */
let _lastSimData=null,_mealSeed=0
function calcSim(){
 const peso=parseFloat(document.getElementById('sim-peso').value)
 const alt=parseFloat(document.getElementById('sim-alt').value)
 const idade=parseFloat(document.getElementById('sim-idade').value)
 const errBox=document.getElementById('sim-err'),errTxt=document.getElementById('sim-err-txt')
 if(!errBox)return
 errBox.style.display='none'
 if(!peso||peso<20||peso>300){if(errTxt)errTxt.textContent='Peso inválido.';errBox.style.display='flex';return}
 if(!alt||alt<100||alt>250){if(errTxt)errTxt.textContent='Altura inválida (cm).';errBox.style.display='flex';return}
 if(!idade||idade<10||idade>110){if(errTxt)errTxt.textContent='Idade inválida.';errBox.style.display='flex';return}
 const sexo=getGroupVal('sim-sexo','.sim-opt'),ativ=getGroupVal('sim-ativ','.sim-opt'),obj=getGroupVal('sim-obj','.sim-opt')
 const treino=parseInt(document.getElementById('sim-treino').value)
 const metaKg=parseFloat(document.getElementById('sim-meta').value)
 const tmb=calcTMB(peso,alt,idade,sexo)
 const fatores={sed:1.2,leve:1.375,mod:1.55,int:1.725}
 const tdee=Math.round(tmb*fatores[ativ])
 const aguaL=(peso*35/1000).toFixed(1)
 let scenarios
 if(obj==='perder'){
 scenarios=[{label:'Leve',icon:'',deficit:300,color:'#4ade80'},{label:'Moderado',icon:'',deficit:500,color:'#facc15'},{label:'Agressivo',icon:'',deficit:700,color:'#f87171'}]
 .map(s=>({...s,semanas:Math.round((metaKg*7700)/s.deficit),kcalMeta:tdee-s.deficit}))
 }else{
 scenarios=[{label:'Conservador',icon:'',taxa:0.5,surplus:250,color:'#4ade80'},{label:'Moderado',icon:'',taxa:0.75,surplus:400,color:'#facc15'},{label:'Acelerado',icon:'',taxa:1.0,surplus:600,color:'#60a5fa'}]
 .map(s=>({...s,semanas:Math.round((metaKg/s.taxa)*4.33),kcalMeta:tdee+s.surplus}))
 }
 const kcalBase=scenarios[1].kcalMeta
 const protG=Math.round((obj==='perder'?2.0:1.8)*peso)
 const gordG=Math.round(0.9*peso)
 const carbG=Math.max(50,Math.round((kcalBase-protG*4-gordG*9)/4))
 _lastSimData={peso,alt,idade,sexo,ativ,obj,treino,metaKg,tmb,tdee,scenarios,protG,carbG,gordG,kcalBase,aguaL}
 const cenMod=scenarios[1]
 const scHTML=scenarios.map((s,i)=>`
 <div class="sim-scenario${i===1?' highlight':''}">
 ${i===1?'<div class="sim-scenario-badge">RECOMENDADO</div>':''}
 <div class="sim-scenario-label">${s.label}</div>
 <div class="sim-scenario-weeks">${s.semanas}<small>sem.</small></div>
 <div class="sim-scenario-kcal">${s.kcalMeta} kcal</div>
 <div class="sim-scenario-def" style="color:${s.color}">${obj==='perder'?'−'+s.deficit:'+'+s.surplus} kcal</div>
 </div>`).join('')
 const tlHTML=[.25,.5,.75,1].map((pct,i)=>{
 const sem=Math.round(cenMod.semanas*pct),kg=(metaKg*pct).toFixed(1)
 const emojis=['','','','']
 return`<div class="sim-tl-item">
 <div class="sim-tl-dot">${emojis[i]}</div>
 <div class="sim-tl-content">
 <div class="sim-tl-week">Semana ${sem} - ${Math.round(pct*100)}%</div>
 <div class="sim-tl-title">${obj==='perder'?'−'+kg+'kg':'+'+kg+'kg'}${pct===1?' ✓ Objetivo!':''}</div>
 <div class="sim-prog-bar"><div class="sim-prog-fill" style="width:${Math.round(pct*100)}%;background:${obj==='perder'?'#4ade80':'#60a5fa'}"></div></div>
 </div>
 </div>`}).join('')
 const res=document.getElementById('sim-result')
 if(!res)return
 res.style.borderColor='rgba(0,102,255,.35)';res.style.background='rgba(0,102,255,.06)'
 res.classList.remove('show');void res.offsetWidth;res.classList.add('show')
 res.innerHTML=`
 <div class="sim-hero">
 <div class="sim-hero-sub">Calorias diárias - cenário moderado</div>
 <div class="sim-hero-kcal">${kcalBase}<span style="font-size:16px;font-family:var(--fb);color:var(--mt);font-weight:300"> kcal</span></div>
 <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--mt)">
 <span>TMB: <strong style="color:var(--tx)">${tmb}</strong></span>
 <span>TDEE: <strong style="color:var(--tx)">${tdee}</strong></span>
 <span>Meta: <strong style="color:var(--pu2)">${obj==='perder'?'−':'+'} ${metaKg}kg</strong></span>
 </div>
 <div class="sim-water-tag">Água: <strong>${aguaL}L/dia</strong></div>
 </div>
 <div><div style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--pu2);margin-bottom:8px"> Cenários</div><div class="sim-scenarios">${scHTML}</div></div>
 <div class="sim-macro-row">
 <div class="sim-macro-chip"><div class="sim-macro-chip-val" style="color:#60a5fa">${protG}g</div><div class="sim-macro-chip-lbl">Proteína</div></div>
 <div class="sim-macro-chip"><div class="sim-macro-chip-val" style="color:#facc15">${carbG}g</div><div class="sim-macro-chip-lbl">Carbo</div></div>
 <div class="sim-macro-chip"><div class="sim-macro-chip-val" style="color:#f97316">${gordG}g</div><div class="sim-macro-chip-lbl">Gordura</div></div>
 </div>
 <div><div style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--pu2);margin-bottom:8px"> Linha do tempo (moderado)</div><div class="sim-timeline">${tlHTML}</div></div>
 <div class="sim-action-row">
 <button class="sim-action-btn" style="background:var(--pu);color:#fff" onclick="calcSim()">Recalcular</button>
 <button class="sim-action-btn" style="background:var(--gr);color:#fff" onclick="gerarPDFSim()"> PDF</button>
 </div>
 <div class="sim-warn"> Estimativas. Consulte um educador físico e nutricionista.</div>`
 setTimeout(()=>res.scrollIntoView({behavior:'smooth',block:'nearest'}),60)
}
function setupSim(){
 const btn=document.getElementById('sim-calc-btn')
 if(btn&&!btn._simListenerAttached){
 btn.addEventListener('click',calcSim)
 btn._simListenerAttached=true
 }
 const clrBtn=document.getElementById('sim-clr-btn')
 if(clrBtn&&!clrBtn._simClrAttached){
 clrBtn.addEventListener('click',()=>{
 ;['sim-peso','sim-alt','sim-idade'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''})
 const errBox=document.getElementById('sim-err');if(errBox)errBox.style.display='none'
 const r=document.getElementById('sim-result');if(r){r.classList.remove('show');r.innerHTML=''}
 })
 clrBtn._simClrAttached=true
 }
}
try{setupSim()}catch(e){console.error("setupSim error:",e)}


/* 1RM */
function setup1RM(){
 const calc=()=>{
 const peso=parseFloat(document.getElementById('rm-peso').value)
 const reps=parseInt(document.getElementById('rm-reps').value)
 const errBox=document.getElementById('rm-err'),errTxt=document.getElementById('rm-err-txt')
 if(errBox)errBox.style.display='none'
 if(!peso||peso<=0){if(errTxt)errTxt.textContent='Carga inválida.';if(errBox)errBox.style.display='flex';return}
 if(!reps||reps<=0||reps>30){if(errTxt)errTxt.textContent='Repetições inválidas (max 30).';if(errBox)errBox.style.display='flex';return}
 const rm=Math.round(peso*(1+reps/30))
 const res=document.getElementById('rm-result')
 res.style.borderColor='rgba(96,165,250,.35)';res.style.background='rgba(96,165,250,.06)'
 res.classList.remove('show');void res.offsetWidth;res.classList.add('show')
 res.innerHTML=`
 <div style="text-align:center;padding:10px 0">
 <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#93c5fd;margin-bottom:4px">Sua 1RM Estimada</div>
 <div style="font-size:42px;font-family:var(--ff);color:#60a5fa;margin:8px 0;line-height:1">${rm} kg</div>
 </div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
 <div style="background:var(--s2);padding:10px;border-radius:8px;text-align:center;border:1px solid var(--bd)"><div style="font-size:11px;color:var(--mt)">90% (2-3 reps)</div><div style="font-weight:bold;color:var(--tx);margin-top:4px">${Math.round(rm*0.9)} kg</div></div>
 <div style="background:var(--s2);padding:10px;border-radius:8px;text-align:center;border:1px solid var(--bd)"><div style="font-size:11px;color:var(--mt)">80% (6-8 reps)</div><div style="font-weight:bold;color:var(--tx);margin-top:4px">${Math.round(rm*0.8)} kg</div></div>
 <div style="background:var(--s2);padding:10px;border-radius:8px;text-align:center;border:1px solid var(--bd)"><div style="font-size:11px;color:var(--mt)">70% (10-12 reps)</div><div style="font-weight:bold;color:var(--tx);margin-top:4px">${Math.round(rm*0.7)} kg</div></div>
 <div style="background:var(--s2);padding:10px;border-radius:8px;text-align:center;border:1px solid var(--bd)"><div style="font-size:11px;color:var(--mt)">60% (15+ reps)</div><div style="font-weight:bold;color:var(--tx);margin-top:4px">${Math.round(rm*0.6)} kg</div></div>
 </div>
 <button class="btn-pdf-single" style="margin-top:12px;width:100%" onclick="gerarPDF1RM(${rm}, ${peso}, ${reps})"> Baixar Relatório PDF</button>
 `
 setTimeout(()=>res.scrollIntoView({behavior:'smooth',block:'nearest'}),60)
 }
 document.getElementById('rm-calc-btn')?.addEventListener('click',calc)
 document.getElementById('rm-clr-btn')?.addEventListener('click',()=>{document.getElementById('rm-peso').value='';document.getElementById('rm-reps').value='';const errBox=document.getElementById('rm-err');if(errBox)errBox.style.display='none';const r=document.getElementById('rm-result');if(r){r.classList.remove('show');r.innerHTML=''}})
}
try{setup1RM()}catch(e){console.error("setup1RM error:",e)}

/* PDF HELPERS - lightweight */
function pdfDoc(){
 const{jsPDF}=window.jspdf
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
 const W=210,H=297,M=16
 const san=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x00-\x7F]/g,'?')
 const _t=doc.text.bind(doc)
 doc.text=(txt,...a)=>{if(Array.isArray(txt))return _t(txt.map(v=>san(v)),...a);return _t(san(String(txt)),...a)}
 const _sp=doc.splitTextToSize.bind(doc)
 doc.splitTextToSize=(txt,w,...a)=>_sp(san(String(txt)),w,...a)
 return{doc,W,H,M,
 bg:(c)=>{doc.setFillColor(...c);doc.rect(0,0,W,H,'F')},
 rect:(x,y,w,h,c,r=0)=>{doc.setFillColor(...c);r>0?doc.roundedRect(x,y,w,h,r,r,'F'):doc.rect(x,y,w,h,'F')},
 line:(y,c=[210,205,220],lw=.4)=>{doc.setDrawColor(...c);doc.setLineWidth(lw);doc.line(M,y,W-M,y)},
 tx:(sz,b,c)=>{doc.setFontSize(sz);doc.setFont('helvetica',b?'bold':'normal');doc.setTextColor(...c)},
 wrap:(t,w)=>doc.splitTextToSize(String(t),w)
 }
}
function pdfHeader(doc,W,M,tx,line,title,sub){
 doc.setFillColor(255,255,255);doc.rect(0,0,W,3,'F')
 doc.setFillColor(0,102,255);doc.rect(0,0,W,3,'F')
 doc.setFillColor(0,102,255);doc.roundedRect(M,8,28,11,2,2,'F')
 tx(7,true,[255,255,255]);doc.text('STUDIO FOCUS',M+14,14.5,{align:'center'})
 const now=new Date()
 tx(7,false,[110,108,125]);doc.text(now.toLocaleDateString('pt-BR'),W-M,12,{align:'right'})
 tx(20,true,[18,16,30]);doc.text(title,M,32)
 if(sub){tx(8,false,[90,88,105]);doc.text(sub,M,40)}
 line(sub?45:43,[200,195,220],.5)
 return sub?50:48
}

function pdfAviso(doc, x, y, w, isPositive, title, text, tx, wrap, rect) {
    const bgC = isPositive ? [240, 253, 244] : [254, 242, 242]; // light green vs light red
    const bdC = isPositive ? [34, 197, 94] : [239, 68, 68]; // dark green vs dark red
    
    rect(x, y, w, 28, bgC, 4);
    doc.setFillColor(...bdC);
    doc.rect(x, y, 3, 28, 'F');
    
    tx(9, true, bdC);
    doc.text(isPositive ? 'POSITIVO' : 'ATENCAO', x + 8, y + 8);
    
    tx(8, true, [18, 16, 30]);
    doc.text(title, x + 35, y + 8);
    
    tx(9, false, [90, 90, 114]);
    doc.text(wrap(text, w - 12), x + 8, y + 14);
    
    return y + 34; // return new y
}
function pdfFooter(doc,W,M,H,tx,line){
 line(H-16,[210,205,220],.4)
 tx(6,false,[140,135,155])
 doc.text('Studio Focus - R. Silvio Serveline, 37 - Garca SP - (14) 98218-0923',W/2,H-9,{align:'center'})
 doc.text('Valores estimados. Consulte um profissional de saude para orientacao personalizada.',W/2,H-4,{align:'center'})
}


async function generatePDF({peso,altura,imc,range:r,pesoIdeal:pi,tmb,sexo,idade}){
 if(!window.jspdf) {
    try { await loadJSPDF(); } catch(e) { return; }
  }
 try{
  let _btn = null, _origHTML = '';
  try { if(event && event.currentTarget && event.currentTarget.tagName === 'BUTTON') _btn = event.currentTarget; } catch(e){}
  if(!_btn && document.activeElement && document.activeElement.tagName === 'BUTTON') _btn = document.activeElement;
  if(_btn) { _origHTML = _btn.innerHTML; _btn.innerHTML = '⌛ Gerando...'; _btn.style.pointerEvents = 'none'; _btn.style.opacity = '0.7'; }

  const{doc,W,H,M,bg,rect,line,tx,wrap}=pdfDoc()
  bg([255,255,255])
  let y=pdfHeader(doc,W,M,tx,line,'Relatorio de IMC','Indice de Massa Corporal - OMS')
  rect(M,y,W-M*2,30,[238,235,255],4);doc.setFillColor(0,102,255);doc.rect(M,y,3,30,'F')
  tx(7,false,[90,88,110]);doc.text('SEU IMC',M+8,y+8)
  tx(24,true,[0,102,255]);doc.text(imc.toFixed(2),M+8,y+22)
  tx(9,true,[18,16,30]);doc.text(r.label,W-M,y+18,{align:'right'})
  y+=36
  const items=[{l:'Peso',v:peso+' kg'},{l:'Altura',v:altura+' cm'},{l:'Idade',v:idade+' anos'},{l:'Sexo',v:sexo==='m'?'Masc.':'Fem.'},{l:'Peso ideal min',v:pi.mn+' kg'},{l:'Peso ideal max',v:pi.mx+' kg'},{l:'TMB',v:tmb+' kcal'}]
  const cw=(W-M*2-12)/4;items.forEach((it,i)=>{const cx=M+(i%4)*(cw+4),cy=y+Math.floor(i/4)*28;rect(cx,cy,cw,24,[248,247,251],2);tx(7,false,[120,115,132]);doc.text(String(it.l),cx+5,cy+8);tx(12,true,[18,16,30]);doc.text(String(it.v),cx+5,cy+19)})
  y+=Math.ceil(items.length/4)*28+8;line(y);y+=6
  tx(9,true,[0,102,255]);doc.text('O que significa:',M,y);y+=6
  tx(9,false,[45,43,60]);const msgLines=wrap(r.msg,W-M*2);doc.text(msgLines,M,y);y+=msgLines.length*5+6
  tx(9,true,[0,102,255]);doc.text('Recomendacao:',M,y);y+=6
  tx(9,false,[45,43,60]);const tipLines=wrap(r.tip,W-M*2-10);rect(M,y-3,W-M*2,tipLines.length*5+12,[238,235,255],3);doc.setFillColor(0,102,255);doc.rect(M,y-3,3,tipLines.length*5+12,'F');doc.text(tipLines,M+8,y+4);y+=tipLines.length*5+18
  pdfFooter(doc,W,M,H,tx,line)

  /* Pagina 2 - Informacoes e orientacoes */
  doc.addPage()
  bg([255,255,255])
  doc.setFillColor(0,102,255);doc.rect(0,0,W,2,'F')
  let p2=14
  tx(9,true,[0,102,255]);doc.text('INFORMACOES E ORIENTACOES',M,p2);p2+=7
  line(p2,[210,205,220],.4);p2+=8

  // Bloco 1 - O que e o IMC
  
  let isPosIMC = (imc >= 18.5 && imc <= 24.9);
  let avTitleIMC = isPosIMC ? 'Peso Saudavel' : 'Atencao a saude';
  let avTxtIMC = isPosIMC ? 'Seu IMC esta na faixa ideal! Continue mantendo bons habitos de alimentacao e exercicios.' : 'Seu IMC esta fora da faixa considerada ideal pela OMS. Procure orientacao medica e nutricional.';
  p2 = pdfAviso(doc, M, p2, W-M*2, isPosIMC, avTitleIMC, avTxtIMC, tx, wrap, rect);
  
  tx(10,true,[18,16,30]);doc.text('O que e o IMC?',M,p2);p2+=6
  const expIMC=wrap('O Indice de Massa Corporal (IMC) e uma medida internacional adotada pela Organizacao Mundial da Saude (OMS) para avaliar se o peso de uma pessoa esta adequado em relacao a sua altura. E calculado dividindo o peso em quilogramas pelo quadrado da altura em metros. Simples, rapido e amplamente usado como triagem em saude publica.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(expIMC,M,p2);p2+=expIMC.length*5+5
  rect(M,p2,W-M*2,12,[235,242,255],3)
  tx(9,true,[0,102,255]);doc.text('Formula:  IMC = peso (kg) / ( altura (m) x altura (m) )',W/2,p2+8,{align:'center'})
  p2+=19

  // Bloco 2 - Faixas de classificacao
  tx(10,true,[18,16,30]);doc.text('Faixas de classificacao (OMS)',M,p2);p2+=6
  const FAIXAS=[
   ['Abaixo do peso','< 18,5','Possivel risco nutricional'],
   ['Peso normal','18,5 - 24,9','Faixa considerada saudavel'],
   ['Sobrepeso','25,0 - 29,9','Atencao ao estilo de vida'],
   ['Obesidade Grau I','30,0 - 34,9','Risco elevado para a saude'],
   ['Obesidade Grau II e III','>= 35,0','Cuidado medico especializado'],
  ]
  const cA=M,cB=M+86,cC=M+120
  doc.setFillColor(0,102,255);doc.roundedRect(M,p2,W-M*2,7,1,1,'F')
  tx(7,true,[255,255,255]);doc.text('CLASSIFICACAO',cA+3,p2+5);doc.text('FAIXA DE IMC',cB+3,p2+5);doc.text('INDICACAO',cC+3,p2+5)
  p2+=9
  FAIXAS.forEach((row,i)=>{
   rect(M,p2,W-M*2,8,i%2===0?[248,247,251]:[255,255,255],0)
   const norm=i===1
   tx(8,norm,norm?[0,102,255]:[40,38,55]);doc.text(row[0],cA+3,p2+5.5)
   tx(8,false,[40,38,55]);doc.text(row[1],cB+3,p2+5.5)
   tx(7.5,false,[100,95,115]);doc.text(row[2],cC+3,p2+5.5)
   p2+=9
  })
  p2+=7

  // Bloco 3 - Estimativa, nao diagnostico
  tx(10,true,[18,16,30]);doc.text('Este resultado e uma estimativa',M,p2);p2+=6
  const discl=wrap('O IMC e uma ferramenta de triagem, nao um diagnostico medico. Ele nao considera fatores individuais como percentual de gordura corporal, massa muscular, distribuicao de gordura ou condicoes clinicas especificas. Atletas com alta massa muscular, idosos, gestantes e criancas podem obter resultados que nao refletem com precisao seu real estado de saude. Use este relatorio como ponto de partida, nao como conclusao.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(discl,M,p2);p2+=discl.length*5+7

  // Bloco 4 - Orientacao profissional
  tx(10,true,[18,16,30]);doc.text('Quando buscar orientacao profissional?',M,p2);p2+=6
  const orient=wrap('Recomendamos consultar um medico, nutricionista ou educador fisico para uma avaliacao completa e personalizada - independentemente do resultado obtido. Um profissional podera analisar sua composicao corporal, historico de saude e objetivos individuais para oferecer orientacao adequada e segura.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(orient,M,p2);p2+=orient.length*5+8

  // Rodape informativo Studio Focus
  rect(M,p2,W-M*2,17,[235,242,255],3)
  doc.setFillColor(0,102,255);doc.rect(M,p2,2,17,'F')
  tx(8.5,true,[0,102,255]);doc.text('Studio Focus - Academia em Garca, SP',M+6,p2+6)
  tx(8,false,[70,68,85]);doc.text('(14) 98218-0923  |  Seg-Sex: 06h-22h  |  Sab: 08h-12h',M+6,p2+13)

  pdfFooter(doc,W,M,H,tx,line)
  doc.save('StudioFocus_IMC_'+imc.toFixed(1)+'.pdf')
 
  if(_btn) { _btn.innerHTML = _origHTML; _btn.style.pointerEvents = ''; _btn.style.opacity = '1'; }
}catch(e){showToast('Erro ao gerar PDF', 'error')}
}


async function gerarPDF1RM(rm, peso, reps){
 if(!window.jspdf) {
    try { await loadJSPDF(); } catch(e) { return; }
  }
 try{
  let _btn = null, _origHTML = '';
  try { if(event && event.currentTarget && event.currentTarget.tagName === 'BUTTON') _btn = event.currentTarget; } catch(e){}
  if(!_btn && document.activeElement && document.activeElement.tagName === 'BUTTON') _btn = document.activeElement;
  if(_btn) { _origHTML = _btn.innerHTML; _btn.innerHTML = '⌛ Gerando...'; _btn.style.pointerEvents = 'none'; _btn.style.opacity = '0.7'; }

  const{doc,W,H,M,bg,rect,line,tx,wrap}=pdfDoc()
  bg([255,255,255])
  let y=pdfHeader(doc,W,M,tx,line,'Relatório de 1RM','Carga máxima e tabela de treino - Fórmula de Epley')
  
  rect(M,y,W-M*2,26,[235,245,255],4);doc.setFillColor(0,102,255);doc.rect(M,y,3,26,'F')
  tx(7,false,[0,102,255]);doc.text('CARGA MÁXIMA ESTIMADA (1RM)',M+8,y+8)
  tx(22,true,[18,16,30]);doc.text(String(rm)+' kg',M+8,y+20);y+=34

  tx(10,true,[18,16,30]);doc.text('Dados Informados:',M,y);y+=8
  tx(9,false,[90,90,114]);doc.text('Carga utilizada: '+peso+' kg  |  Repetições feitas: '+reps,M,y);y+=12
  
  tx(10,true,[18,16,30]);doc.text('Tabela de Porcentagens de Treino:',M,y);y+=8
  
  const faixas = [
    { p: 90, r: '2 a 3 reps', label: 'Força Pura' },
    { p: 80, r: '6 a 8 reps', label: 'Hipertrofia/Força' },
    { p: 70, r: '10 a 12 reps', label: 'Hipertrofia' },
    { p: 60, r: '15+ reps', label: 'Resistência' }
  ]
  
  faixas.forEach(f=>{
   const carga = Math.round(rm * (f.p/100))
   tx(9,true,[18,16,30]);doc.text(f.p+'% ( '+f.r+' ):',M,y)
   tx(10,true,[0,102,255]);doc.text(String(carga)+' kg',M+40,y)
   tx(8,false,[138,138,158]);doc.text(f.label,M+60,y)
   y+=8
  })
  
  y+=8
  line(y,[230,230,238]);y+=12
  
  let isPosRM = rm >= peso * 1.2;
  let avTitleRM = isPosRM ? 'Forca Excelente' : 'Aviso de Seguranca';
  let avTxtRM = isPosRM ? 'Parabens! Sua forca base para o exercicio testado e muito boa. Continue os treinos de progressao de carga.' : 'Lembre-se: nunca tente bater sua 1RM real sem ajuda de um parceiro ou instrutor qualificado.';
  y = pdfAviso(doc, M, y, W-M*2, isPosRM, avTitleRM, avTxtRM, tx, wrap, rect);
  
  tx(10,true,[18,16,30]);doc.text('O que é a 1RM?',M,y);y+=7
  tx(9,false,[90,90,114])
  wrap('1RM (Uma Repetição Máxima) é a quantidade máxima de peso que você consegue levantar em um único esforço máximo. Ela é a principal base para planejar treinos de força e hipertrofia com precisão.',M,y,W-M*2,5)
  y+=15
  wrap('A Fórmula de Epley usada é uma estimativa confiável para quando você realiza testes com cargas menores (ex: 5-10 repetições máximas), evitando o risco de lesão de um teste de 1RM real.',M,y,W-M*2,5)

  // Pagina 2 - Dicas
  doc.addPage();bg([255,255,255])
  y=M+10
  tx(14,true,[18,16,30]);doc.text('Como usar essas porcentagens?',M,y);y+=10
  tx(9,false,[90,90,114])
  wrap('• Força (85-100%): Ideal para ganhos de força bruta. Séries curtas (1-5 reps) e intervalos longos de descanso (3-5 min).',M,y,W-M*2,6);y+=14
  wrap('• Hipertrofia (70-80%): Foco no ganho de massa muscular. Séries médias (8-12 reps) e intervalos moderados (1-2 min).',M,y,W-M*2,6);y+=14
  wrap('• Resistência (<70%): Melhora da resistência muscular. Séries longas (15+ reps) e intervalos curtos (30-60 seg).',M,y,W-M*2,6);y+=20
  
  rect(M,y,W-M*2,26,[244,244,248],4);doc.setFillColor(138,138,158);doc.rect(M,y,3,26,'F')
  tx(8,true,[138,138,158]);doc.text('AVISO IMPORTANTE',M+8,y+8)
  tx(8,false,[90,90,114]);wrap('Isso é apenas uma estimativa. Se você nunca treinou pesado, não tente fazer testes de 1RM sozinho.',M+8,y+14,W-M*2-12,4)
  y+=36
  
  pdfFooter(doc,W,H,M,tx,line)
  doc.save('StudioFocus_1RM.pdf')
 
  if(_btn) { _btn.innerHTML = _origHTML; _btn.style.pointerEvents = ''; _btn.style.opacity = '1'; }
}catch(e){showToast('Erro ao gerar PDF', 'error')}
}

async function gerarPDFCalorias(tmb,peso,alt,idade,sexo){
 if(!window.jspdf) {
    try { await loadJSPDF(); } catch(e) { return; }
  }
 try{
  let _btn = null, _origHTML = '';
  try { if(event && event.currentTarget && event.currentTarget.tagName === 'BUTTON') _btn = event.currentTarget; } catch(e){}
  if(!_btn && document.activeElement && document.activeElement.tagName === 'BUTTON') _btn = document.activeElement;
  if(_btn) { _origHTML = _btn.innerHTML; _btn.innerHTML = '⌛ Gerando...'; _btn.style.pointerEvents = 'none'; _btn.style.opacity = '0.7'; }

  const{doc,W,H,M,bg,rect,line,tx,wrap}=pdfDoc()
  bg([255,255,255])
  let y=pdfHeader(doc,W,M,tx,line,'Relatorio de Calorias','Necessidade calorica diaria - Mifflin-St Jeor')
  rect(M,y,W-M*2,28,[235,245,255],4);doc.setFillColor(0,102,255);doc.rect(M,y,3,28,'F')
  tx(7,false,[0,102,255]);doc.text('TAXA METABOLICA BASAL (TMB)',M+8,y+8)
  tx(22,true,[18,16,30]);doc.text(String(tmb)+' kcal/dia',M+8,y+22);y+=34
  const niveis=[{l:'Sedentario',f:1.2,c:[59,130,246]},{l:'Leve (1-3x/sem)',f:1.375,c:[99,102,241]},{l:'Moderado (3-5x/sem)',f:1.55,c:[124,58,237]},{l:'Muito ativo (6-7x/sem)',f:1.725,c:[192,38,211]}]
  niveis.forEach(n=>{
   const tdee=Math.round(tmb*n.f)
   tx(9,true,[18,16,30]);doc.text(n.l+':',M,y+5)
   tx(9,false,[80,80,90]);doc.text(tdee+' kcal/dia',M+80,y+5)
   doc.setFillColor(225,222,232);doc.roundedRect(M,y+8,W-M*2,6,2,2,'F')
   doc.setFillColor(...n.c);doc.roundedRect(M,y+8,(W-M*2)*(n.f-1.2)/(1.725-1.2),6,2,2,'F')
   y+=18
  })
  pdfFooter(doc,W,M,H,tx,line)

  /* Pagina 2 - O que e e para que serve */
  doc.addPage()
  bg([255,255,255])
  doc.setFillColor(0,102,255);doc.rect(0,0,W,2,'F')
  let p2=14
  tx(9,true,[0,102,255]);doc.text('INFORMACOES E ORIENTACOES',M,p2);p2+=7
  line(p2,[210,205,220],.4);p2+=8

  
  let avTitle = 'Como usar sua TMB';
  let avTxt = 'Sua TMB e o MINIMO que seu corpo precisa para sobreviver. Nunca coma menos que a sua TMB, pois isso pode causar danos ao seu metabolismo a longo prazo.';
  p2 = pdfAviso(doc, M, p2, W-M*2, false, avTitle, avTxt, tx, wrap, rect);
  
  tx(10,true,[18,16,30]);doc.text('O que e a Calculadora de Calorias?',M,p2);p2+=6
  const expCal=wrap('A Calculadora de Calorias estima sua Taxa Metabolica Basal (TMB) e suas necessidades energeticas diarias com base em peso, altura, idade e sexo. Utiliza a equacao de Mifflin-St Jeor, amplamente reconhecida pela ciencia nutricional como a mais precisa para adultos. A TMB representa a energia que seu corpo consome em repouso absoluto para manter funcoes vitais como respiracao, circulacao e digestao.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(expCal,M,p2);p2+=expCal.length*5+5
  rect(M,p2,W-M*2,12,[235,242,255],3)
  tx(9,true,[0,102,255]);doc.text('Formula (Mifflin-St Jeor):  TMB = 10*P + 6.25*A - 5*I +/- C',W/2,p2+8,{align:'center'})
  p2+=19

  tx(10,true,[18,16,30]);doc.text('Niveis de atividade e gasto energetico (TDEE)',M,p2);p2+=6
  const NIVEIS=[['Sedentario','Sem exercicio','TMB x 1.20'],['Levemente ativo','1-3x/sem','TMB x 1.375'],['Moderado','3-5x/sem','TMB x 1.55'],['Muito ativo','6-7x/sem','TMB x 1.725']]
  const cA2=M,cB2=M+68,cC2=M+126
  doc.setFillColor(0,102,255);doc.roundedRect(M,p2,W-M*2,7,1,1,'F')
  tx(7,true,[255,255,255]);doc.text('NIVEL',cA2+3,p2+5);doc.text('FREQUENCIA',cB2+3,p2+5);doc.text('MULTIPLICADOR',cC2+3,p2+5)
  p2+=9
  NIVEIS.forEach((row,i)=>{rect(M,p2,W-M*2,8,i%2===0?[248,247,251]:[255,255,255],0);tx(8,false,[40,38,55]);doc.text(row[0],cA2+3,p2+5.5);doc.text(row[1],cB2+3,p2+5.5);tx(8,false,[100,95,115]);doc.text(row[2],cC2+3,p2+5.5);p2+=9})
  p2+=7

  tx(10,true,[18,16,30]);doc.text('Este resultado e uma estimativa',M,p2);p2+=6
  const disclalCal=wrap('A formula de Mifflin-St Jeor e uma referencia cientifica reconhecida, mas cada organismo responde de forma unica. Fatores como composicao corporal, nivel hormonal, metabolismo individual e condicoes de saude podem influenciar suas necessidades reais. Use este relatorio como base inicial para seu planejamento alimentar.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(disclalCal,M,p2);p2+=disclalCal.length*5+7

  tx(10,true,[18,16,30]);doc.text('Quando buscar orientacao profissional?',M,p2);p2+=6
  const orientCal=wrap('Recomendamos consultar um nutricionista para um plano alimentar personalizado e detalhado. Um profissional considerara seus objetivos, rotina, preferencias alimentares e historico de saude para otimizar seus resultados de forma segura e eficaz.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(orientCal,M,p2);p2+=orientCal.length*5+8

  rect(M,p2,W-M*2,17,[235,242,255],3)
  doc.setFillColor(0,102,255);doc.rect(M,p2,2,17,'F')
  tx(8.5,true,[0,102,255]);doc.text('Studio Focus - Academia em Garca, SP',M+6,p2+6)
  tx(8,false,[70,68,85]);doc.text('(14) 98218-0923  |  Seg-Sex: 06h-22h  |  Sab: 08h-12h',M+6,p2+13)

  pdfFooter(doc,W,M,H,tx,line)
  doc.save('StudioFocus_Calorias.pdf')
 
  if(_btn) { _btn.innerHTML = _origHTML; _btn.style.pointerEvents = ''; _btn.style.opacity = '1'; }
}catch(e){showToast('Erro interno', 'error')}
}

async function gerarPDFAgua(){
 if(!_lastAguaData){showToast('Calcule os resultados primeiro!', 'error');return}
 if(!window.jspdf) {
    try { await loadJSPDF(); } catch(e) { return; }
  }
 try{
  let _btn = null, _origHTML = '';
  try { if(event && event.currentTarget && event.currentTarget.tagName === 'BUTTON') _btn = event.currentTarget; } catch(e){}
  if(!_btn && document.activeElement && document.activeElement.tagName === 'BUTTON') _btn = document.activeElement;
  if(_btn) { _origHTML = _btn.innerHTML; _btn.innerHTML = '⌛ Gerando...'; _btn.style.pointerEvents = 'none'; _btn.style.opacity = '0.7'; }

  const{peso,ml,litros,copos,manha,tarde,noite}=_lastAguaData
  const{doc,W,H,M,bg,rect,line,tx,wrap}=pdfDoc()
  bg([255,255,255])
  let y=pdfHeader(doc,W,M,tx,line,'Relatorio de Hidratacao','Meta diaria de agua personalizada')
  rect(M,y,W-M*2,30,[235,245,255],4);doc.setFillColor(2,132,199);doc.rect(M,y,3,30,'F')
  tx(7,false,[2,132,199]);doc.text('META DIARIA',M+8,y+8)
  tx(24,true,[18,16,30]);doc.text(litros+'L / dia',M+8,y+22)
  tx(9,false,[80,80,90]);doc.text('= '+copos+' copos de 200ml',M+90,y+22);y+=36
  const segs=[{l:'Manha (06h-12h)',ml:manha,c:[59,130,246]},{l:'Tarde (12h-18h)',ml:tarde,c:[34,197,94]},{l:'Noite (18h-22h)',ml:noite,c:[234,179,8]}]
  const total=manha+tarde+noite
  segs.forEach(s=>{
   tx(9,true,[18,16,30]);doc.text(s.l+':',M,y+5);tx(9,false,[80,80,90]);doc.text((s.ml/1000).toFixed(1)+'L',M+80,y+5)
   doc.setFillColor(225,222,232);doc.roundedRect(M,y+8,W-M*2,6,2,2,'F')
   doc.setFillColor(...s.c);doc.roundedRect(M,y+8,(W-M*2)*(s.ml/total),6,2,2,'F');y+=18
  })
  pdfFooter(doc,W,M,H,tx,line)

  /* Pagina 2 - O que e e para que serve */
  doc.addPage()
  bg([255,255,255])
  doc.setFillColor(0,102,255);doc.rect(0,0,W,2,'F')
  let p2a=14
  tx(9,true,[0,102,255]);doc.text('INFORMACOES E ORIENTACOES',M,p2a);p2a+=7
  line(p2a,[210,205,220],.4);p2a+=8

  
  let isPosAgua = litros >= 2.5;
  let avTitleAgua = isPosAgua ? 'Meta Excelente' : 'Aviso de Hidratacao';
  let avTxtAgua = isPosAgua ? 'Sua meta de agua e otima para um estilo de vida ativo e saudavel!' : 'Uma boa hidratacao e fundamental para hipertrofia e saude. Beba agua regularmente!';
  p2a = pdfAviso(doc, M, p2a, W-M*2, isPosAgua, avTitleAgua, avTxtAgua, tx, wrap, rect);
  
  tx(10,true,[18,16,30]);doc.text('O que e o Calculo de Hidratacao?',M,p2a);p2a+=6
  const expAgua=wrap('A Calculadora de Hidratacao Diaria estima a quantidade de agua que seu corpo necessita por dia com base no peso corporal, nivel de atividade fisica, clima e objetivo de saude. A formula base de 35ml por quilograma de peso e amplamente utilizada por profissionais de saude como ponto de partida para garantir hidratacao adequada.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(expAgua,M,p2a);p2a+=expAgua.length*5+5
  rect(M,p2a,W-M*2,12,[235,242,255],3)
  tx(9,true,[0,102,255]);doc.text('Formula base:  Meta (ml) = peso (kg) x 35ml + ajustes por perfil',W/2,p2a+8,{align:'center'})
  p2a+=19

  tx(10,true,[18,16,30]);doc.text('Por que a hidratacao e tao importante?',M,p2a);p2a+=6
  const BENEFICIOS=[['Metabolismo','Acelera o metabolismo e auxilia no controle do peso'],['Performance','Melhora rendimento fisico e reduz fadiga muscular'],['Pele e saude','Contribui para pele hidratada e funcoes celulares'],['Digestao','Auxilia na digestao e absorcao de nutrientes'],['Cognicao','Melhora foco, memoria e funcionamento cerebral']]
  const cAa=M,cBa=M+54
  doc.setFillColor(2,132,199);doc.roundedRect(M,p2a,W-M*2,7,1,1,'F')
  tx(7,true,[255,255,255]);doc.text('BENEFICIO',cAa+3,p2a+5);doc.text('DESCRICAO',cBa+3,p2a+5)
  p2a+=9
  BENEFICIOS.forEach((row,i)=>{rect(M,p2a,W-M*2,8,i%2===0?[235,245,255]:[255,255,255],0);tx(8,true,[2,132,199]);doc.text(row[0],cAa+3,p2a+5.5);tx(8,false,[40,38,55]);doc.text(row[1],cBa+3,p2a+5.5);p2a+=9})
  p2a+=7

  tx(10,true,[18,16,30]);doc.text('Este resultado e uma estimativa',M,p2a);p2a+=6
  const disclalAgua=wrap('Os valores calculados sao estimativas baseadas em parametros gerais. Condicoes como doencas renais, uso de medicamentos, gravidez ou amamentacao podem alterar significativamente as necessidades de hidratacao. Em dias de treino intenso ou clima muito quente, aumente a ingestao de agua conforme sua sede e orientacao profissional.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(disclalAgua,M,p2a);p2a+=disclalAgua.length*5+7

  tx(10,true,[18,16,30]);doc.text('Dicas para manter uma boa hidratacao',M,p2a);p2a+=6
  const dicasAgua=wrap('Distribua a ingestao ao longo do dia. Nao espere sentir sede para beber agua. Prefira agua pura a bebidas acucaradas. Mantenha uma garrafa sempre por perto. No exercicio, beba antes, durante e apos o treino.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(dicasAgua,M,p2a);p2a+=dicasAgua.length*5+8

  rect(M,p2a,W-M*2,17,[235,242,255],3)
  doc.setFillColor(0,102,255);doc.rect(M,p2a,2,17,'F')
  tx(8.5,true,[0,102,255]);doc.text('Studio Focus - Academia em Garca, SP',M+6,p2a+6)
  tx(8,false,[70,68,85]);doc.text('(14) 98218-0923  |  Seg-Sex: 06h-22h  |  Sab: 08h-12h',M+6,p2a+13)

  pdfFooter(doc,W,M,H,tx,line)
  doc.save('StudioFocus_Agua_'+peso+'kg.pdf')
 
  if(_btn) { _btn.innerHTML = _origHTML; _btn.style.pointerEvents = ''; _btn.style.opacity = '1'; }
}catch(e){showToast('Erro interno', 'error')}
}

async function gerarPDFMacros(){
 if(!_lastMacroData){showToast('Calcule os resultados primeiro!', 'error');return}
 if(!window.jspdf) {
    try { await loadJSPDF(); } catch(e) { return; }
  }
 try{
  let _btn = null, _origHTML = '';
  try { if(event && event.currentTarget && event.currentTarget.tagName === 'BUTTON') _btn = event.currentTarget; } catch(e){}
  if(!_btn && document.activeElement && document.activeElement.tagName === 'BUTTON') _btn = document.activeElement;
  if(_btn) { _origHTML = _btn.innerHTML; _btn.innerHTML = '⌛ Gerando...'; _btn.style.pointerEvents = 'none'; _btn.style.opacity = '0.7'; }

  const{totalKcal,protG,carbG,gordFinalG,protPct,carbPct,gordPct,objKey:obj,objLabel,dietaLabel,tmb,tdee,peso}=_lastMacroData
  const{doc,W,H,M,bg,rect,line,tx,wrap}=pdfDoc()
  bg([255,255,255])
  let y=pdfHeader(doc,W,M,tx,line,'Plano de Macronutrientes','Objetivo: '+objLabel+' | Dieta: '+dietaLabel)
  rect(M,y,W-M*2,28,[238,235,255],4);doc.setFillColor(0,102,255);doc.rect(M,y,3,28,'F')
  tx(7,false,[0,102,255]);doc.text('META CALORICA DIARIA',M+8,y+8)
  tx(22,true,[0,102,255]);doc.text(String(totalKcal)+' kcal',M+8,y+22)
  tx(9,false,[80,80,90]);doc.text('TMB '+tmb+' | TDEE '+tdee,W-M,y+18,{align:'right'});y+=34
  const macros=[{n:'Proteinas',g:protG,k:protG*4,pct:protPct,c:[59,130,246]},{n:'Carboidratos',g:carbG,k:carbG*4,pct:carbPct,c:[234,179,8]},{n:'Gorduras',g:gordFinalG,k:gordFinalG*9,pct:gordPct,c:[249,115,22]}]
  macros.forEach(m=>{
   tx(9,true,[18,16,30]);doc.text(m.n+': '+m.g+'g ('+m.k+' kcal | '+m.pct+'%)',M,y+5)
   doc.setFillColor(225,222,232);doc.roundedRect(M,y+8,W-M*2,6,2,2,'F')
   doc.setFillColor(...m.c);doc.roundedRect(M,y+8,(W-M*2)*(m.pct/100),6,2,2,'F');y+=18
  })
  pdfFooter(doc,W,M,H,tx,line)

  /* Pagina 2 - O que e e para que serve */
  doc.addPage()
  bg([255,255,255])
  doc.setFillColor(0,102,255);doc.rect(0,0,W,2,'F')
  let p2m=14
  tx(9,true,[0,102,255]);doc.text('INFORMACOES E ORIENTACOES',M,p2m);p2m+=7
  line(p2m,[210,205,220],.4);p2m+=8

  
  let isPosMac = obj === 'manter';
  let avTitleMac = obj === 'perder' ? 'Deficit Calorico' : (obj === 'ganhar' ? 'Superavit Calorico' : 'Manutencao Ideal');
  let avTxtMac = obj === 'perder' ? 'Esses macros vao te ajudar a perder gordura preservando massa magra. Mantenha as proteinas altas!' : (obj === 'ganhar' ? 'Treine pesado! Esses macros extras ajudarao na construcao muscular.' : 'Foco em saude, longevidade e recomposicao corporal.');
  p2m = pdfAviso(doc, M, p2m, W-M*2, isPosMac || obj === 'ganhar', avTitleMac, avTxtMac, tx, wrap, rect);
  
  tx(10,true,[18,16,30]);doc.text('O que sao Macronutrientes?',M,p2m);p2m+=6
  const expMacro=wrap('Macronutrientes sao os tres nutrientes que fornecem energia ao organismo: proteinas, carboidratos e gorduras. Cada um desempenha funcoes essenciais e distintas no corpo. A proporcao ideal varia conforme objetivo (emagrecimento, manutencao ou ganho de massa), nivel de atividade e estilo alimentar. Este plano usa a formula Mifflin-St Jeor para calcular o gasto energetico e distribui os macros com base no seu objetivo.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(expMacro,M,p2m);p2m+=expMacro.length*5+5

  tx(10,true,[18,16,30]);doc.text('Funcao de cada macronutriente',M,p2m);p2m+=6
  const MACROS_INFO=[['Proteinas','4 kcal/g','Reparacao muscular, saciedade, imunidade'],['Carboidratos','4 kcal/g','Principal fonte de energia, funcao cerebral'],['Gorduras','9 kcal/g','Hormonios, absorcao de vitaminas, energia']]
  const cAm=M,cBm=M+58,cCm=M+98
  doc.setFillColor(0,102,255);doc.roundedRect(M,p2m,W-M*2,7,1,1,'F')
  tx(7,true,[255,255,255]);doc.text('MACRO',cAm+3,p2m+5);doc.text('CALORIAS',cBm+3,p2m+5);doc.text('PRINCIPAL FUNCAO',cCm+3,p2m+5)
  p2m+=9
  MACROS_INFO.forEach((row,i)=>{rect(M,p2m,W-M*2,8,i%2===0?[248,247,251]:[255,255,255],0);tx(8,true,[0,102,255]);doc.text(row[0],cAm+3,p2m+5.5);tx(8,false,[40,38,55]);doc.text(row[1],cBm+3,p2m+5.5);tx(7.5,false,[100,95,115]);doc.text(row[2],cCm+3,p2m+5.5);p2m+=9})
  p2m+=7

  tx(10,true,[18,16,30]);doc.text('Estilos alimentares disponiveis',M,p2m);p2m+=6
  const DIETAS=[['Padrao','Distribuicao equilibrada entre os tres macros para uso geral'],['Low Carb','Restricao de carboidratos ate 100g/dia, mais proteinas e gorduras'],['High Carb','Mais carboidratos para atletas e treinos de alta intensidade']]
  DIETAS.forEach((row,i)=>{rect(M,p2m,W-M*2,10,i%2===0?[248,247,251]:[255,255,255],2);tx(8,true,[0,102,255]);doc.text(row[0]+':',M+4,p2m+7);tx(8,false,[60,58,75]);doc.text(row[1],M+36,p2m+7);p2m+=12})
  p2m+=5

  tx(10,true,[18,16,30]);doc.text('Este resultado e uma estimativa',M,p2m);p2m+=6
  const disclalMacro=wrap('Os valores calculados sao estimativas genericas. As necessidades reais de cada pessoa variam conforme metabolismo, composicao corporal, objetivos especificos e condicoes de saude. Um nutricionista pode criar um plano detalhado e ajustado para sua realidade.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(disclalMacro,M,p2m);p2m+=disclalMacro.length*5+8

  rect(M,p2m,W-M*2,17,[235,242,255],3)
  doc.setFillColor(0,102,255);doc.rect(M,p2m,2,17,'F')
  tx(8.5,true,[0,102,255]);doc.text('Studio Focus - Academia em Garca, SP',M+6,p2m+6)
  tx(8,false,[70,68,85]);doc.text('(14) 98218-0923  |  Seg-Sex: 06h-22h  |  Sab: 08h-12h',M+6,p2m+13)

  pdfFooter(doc,W,M,H,tx,line)
  doc.save('StudioFocus_Macros_'+peso+'kg.pdf')
 
  if(_btn) { _btn.innerHTML = _origHTML; _btn.style.pointerEvents = ''; _btn.style.opacity = '1'; }
}catch(e){showToast('Erro interno', 'error')}
}

async function gerarPDFSim(){
 if(!_lastSimData){showToast('Simule os resultados primeiro!', 'error');return}
 if(!window.jspdf) {
    try { await loadJSPDF(); } catch(e) { return; }
  }
 try{
  let _btn = null, _origHTML = '';
  try { if(event && event.currentTarget && event.currentTarget.tagName === 'BUTTON') _btn = event.currentTarget; } catch(e){}
  if(!_btn && document.activeElement && document.activeElement.tagName === 'BUTTON') _btn = document.activeElement;
  if(_btn) { _origHTML = _btn.innerHTML; _btn.innerHTML = '⌛ Gerando...'; _btn.style.pointerEvents = 'none'; _btn.style.opacity = '0.7'; }

  const{metaKg,obj,scenarios,tmb,tdee,protG,carbG,gordG,kcalBase,aguaL,peso}=_lastSimData
  const{doc,W,H,M,bg,rect,line,tx,wrap}=pdfDoc()
  bg([255,255,255])
  let y=pdfHeader(doc,W,M,tx,line,'Simulador de Metas','Objetivo: '+(obj==='perder'?'Emagrecimento':'Ganho de Massa')+' de '+metaKg+'kg')
  const cenMod=scenarios[1]
  rect(M,y,W-M*2,28,[235,245,255],4);doc.setFillColor(0,102,255);doc.rect(M,y,3,28,'F')
  tx(7,false,[0,102,255]);doc.text('CENARIO MODERADO - RECOMENDADO',M+8,y+8)
  tx(22,true,[18,16,30]);doc.text(String(cenMod.semanas)+' semanas',M+8,y+22)
  tx(9,false,[80,80,90]);doc.text(cenMod.kcalMeta+' kcal/dia | Agua: '+aguaL+'L/dia',W-M,y+20,{align:'right'});y+=34
  scenarios.forEach((s,i)=>{
   const isR=i===1
   if(isR){doc.setFillColor(238,235,255);doc.roundedRect(M,y-2,W-M*2,12,2,2,'F')}
   tx(9,isR,[20,20,30]);doc.text((isR?'>> ':'')+s.label+': '+s.semanas+' semanas | '+s.kcalMeta+' kcal/dia',M+4,y+5);y+=14
  })
  y+=4;line(y);y+=6
  tx(9,true,[0,102,255]);doc.text('Macros diarios (moderado)',M,y);y+=6
  const ms=[['Proteinas',protG+'g',protG*4],['Carboidratos',carbG+'g',carbG*4],['Gorduras',gordG+'g',gordG*9]]
  ms.forEach(m=>{tx(9,false,[40,38,55]);doc.text(m[0]+': '+m[1]+' ('+m[2]+' kcal)',M,y);y+=7})
  pdfFooter(doc,W,M,H,tx,line)

  /* Pagina 2 - O que e e para que serve */
  doc.addPage()
  bg([255,255,255])
  doc.setFillColor(0,102,255);doc.rect(0,0,W,2,'F')
  let p2s=14
  tx(9,true,[0,102,255]);doc.text('INFORMACOES E ORIENTACOES',M,p2s);p2s+=7
  line(p2s,[210,205,220],.4);p2s+=8

  
  let isPosS = obj === 'perder';
  let avTitleS = 'Expectativa Realista';
  let avTxtS = isPosS ? 'Emagrecimento saudavel leva tempo. Nao foque no cenario agressivo a menos que seja acompanhado por um medico.' : 'Construir musculo e mais lento que perder gordura. Seja paciente e mantenha a consistencia.';
  p2s = pdfAviso(doc, M, p2s, W-M*2, isPosS, avTitleS, avTxtS, tx, wrap, rect);
  
  tx(10,true,[18,16,30]);doc.text('O que e o Simulador de Metas?',M,p2s);p2s+=6
  const expSim=wrap('O Simulador de Metas e uma ferramenta que estima o tempo necessario para voce atingir seu objetivo de emagrecimento ou ganho de massa muscular. Com base no seu perfil (peso, altura, idade, nivel de atividade e treinos semanais), ele calcula seu TDEE (gasto energetico total diario) e projeta tres cenarios de deficit ou superavit calorico, mostrando uma linha do tempo realista para seu objetivo.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(expSim,M,p2s);p2s+=expSim.length*5+5
  rect(M,p2s,W-M*2,12,[235,242,255],3)
  tx(9,true,[0,102,255]);doc.text('Referencia:  7.700 kcal = aprox. 1kg de gordura corporal',W/2,p2s+8,{align:'center'})
  p2s+=19

  tx(10,true,[18,16,30]);doc.text('Entendendo os tres cenarios',M,p2s);p2s+=6
  const cenLabel=obj==='perder'?[['Leve (Deficit 300 kcal)','Ritmo suave, sustentavel. Ideal para iniciantes.'],['Moderado (Deficit 500 kcal)','Recomendado. Equilibrio entre velocidade e saude.'],['Agressivo (Deficit 700 kcal)','Mais rapido, exige disciplina e acompanhamento.']]: [['Conservador (+250 kcal)','Ganho lento, menor acumulo de gordura.'],['Moderado (+400 kcal)','Recomendado. Equilibrio entre massa e gordura.'],['Acelerado (+600 kcal)','Maior ganho, pode incluir mais gordura corporal.']]
  const cAs=M,cBs=M+78
  doc.setFillColor(0,102,255);doc.roundedRect(M,p2s,W-M*2,7,1,1,'F')
  tx(7,true,[255,255,255]);doc.text('CENARIO',cAs+3,p2s+5);doc.text('DESCRICAO',cBs+3,p2s+5)
  p2s+=9
  cenLabel.forEach((row,i)=>{const isRec=i===1;rect(M,p2s,W-M*2,8,isRec?[238,235,255]:(i%2===0?[248,247,251]:[255,255,255]),0);tx(8,isRec,isRec?[0,102,255]:[40,38,55]);doc.text((isRec?'>> ':'')+row[0],cAs+3,p2s+5.5);tx(8,false,[60,58,75]);doc.text(row[1],cBs+3,p2s+5.5);p2s+=9})
  p2s+=7

  tx(10,true,[18,16,30]);doc.text('Este resultado e uma estimativa',M,p2s);p2s+=6
  const disclalSim=wrap('Os prazos calculados sao estimativas baseadas em principios gerais de fisiologia. Na pratica, o corpo humano passa por adaptacoes metabolicas que podem alterar o ritmo de emagrecimento ou ganho de massa. Consistencia, qualidade do sono, nivel de estresse e acompanhamento profissional sao fundamentais para o sucesso.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(disclalSim,M,p2s);p2s+=disclalSim.length*5+7

  tx(10,true,[18,16,30]);doc.text('Como maximizar seus resultados?',M,p2s);p2s+=6
  const orientSim=wrap('Combine planejamento alimentar com treino regular e estruturado. Um educador fisico pode personalizar seu programa de exercicios e um nutricionista pode ajustar suas metas calorica e macros conforme sua evolucao. No Studio Focus, nossos profissionais estao prontos para te acompanhar em cada etapa da sua transformacao.',W-M*2)
  tx(8.5,false,[60,55,75]);doc.text(orientSim,M,p2s);p2s+=orientSim.length*5+8

  rect(M,p2s,W-M*2,17,[235,242,255],3)
  doc.setFillColor(0,102,255);doc.rect(M,p2s,2,17,'F')
  tx(8.5,true,[0,102,255]);doc.text('Studio Focus - Academia em Garca, SP',M+6,p2s+6)
  tx(8,false,[70,68,85]);doc.text('(14) 98218-0923  |  Seg-Sex: 06h-22h  |  Sab: 08h-12h',M+6,p2s+13)

  pdfFooter(doc,W,M,H,tx,line)
  doc.save('StudioFocus_Meta_'+peso+'kg.pdf')
 
  if(_btn) { _btn.innerHTML = _origHTML; _btn.style.pointerEvents = ''; _btn.style.opacity = '1'; }
}catch(e){showToast('Erro interno', 'error')}
}

/* TUTORIAL */
const TUT_STEPS=[
 {targetId:'hamburger',
  title:'Menu de Ferramentas',
  desc:'Toque aqui para abrir o menu lateral com todas as ferramentas gratuitas do Studio Focus.',
  pos:'below'},
 {targetId:'drawer-imc-btn',
  title:'Calculadora de IMC',
  desc:'Calcula seu Índice de Massa Corporal com classificação OMS, peso ideal, TMB e relatório em PDF.',
  pos:'right',openDrawer:true},
 {targetId:'drawer-cal-btn',
  title:'Calculadora de Calorias',
  desc:'Descubra sua necessidade calórica diária (TMB e TDEE) com base no seu perfil e nível de atividade.',
  pos:'right',keepDrawer:true},
 {targetId:'drawer-agua-btn',
  title:'Hidratação Diária',
  desc:'Sua meta personalizada de água distribuída em manhã, tarde e noite. Inclui dicas e alertas de hidratação.',
  pos:'right',keepDrawer:true},
 {targetId:'drawer-macro-btn',
  title:'Calculadora de Macros',
  desc:'Proteínas, carboidratos e gorduras por dia, ajustados ao seu objetivo e estilo alimentar.',
  pos:'right',keepDrawer:true},
 {targetId:'drawer-sim-btn',
  title:'Simulador de Metas',
  desc:'Veja em quanto tempo você atinge seu objetivo em 3 cenários - perda de peso, ganho de massa ou manutenção.',
  pos:'right',keepDrawer:true},
 {targetId:'drawer-rm-btn',
  title:'Calculadora de 1RM',
  desc:'Estime sua carga máxima com a fórmula de Epley. Saiba o máximo que você consegue levantar em cada exercício.',
  pos:'right',keepDrawer:true},
 {targetId:'drawer-alarm-btn',
  title:'Alarme de Suplementos',
  desc:'Configure horários para receber notificações no celular lembrando de tomar creatina e whey. Requer instalação como app.',
  pos:'right',keepDrawer:true},
 /* TREINO [COMENTADO]
 {targetId:'drawer-treino-btn',
  title:'Monte seu Treino',
  desc:'Biblioteca completa de exercícios com técnica, grupos musculares, variações e séries recomendadas.',
  pos:'right',keepDrawer:true},
 {targetId:'drawer-plano-btn',
  title:'Meu Treino Semanal',
  desc:'Visualize seu treino organizado por dia da semana - segunda a sábado - pronto para seguir na academia.',
  pos:'right',keepDrawer:true},
 */
 {targetId:'nav-planos-btn',
  title:'Veja Nossos Planos',
  desc:'Conheça os planos do Studio Focus e comece sua transformação com acompanhamento profissional!',
  pos:'below',closeDrawer:true,forceShow:true},
]
let _tutStep=0,_tutActive=false
function abrirTutorial(){document.getElementById('tut-welcome').classList.add('show')}
function showTutWelcome(){document.getElementById('tut-welcome').classList.add('show')}
function skipTutorial(forever=false){if(forever){const d=new Date;d.setFullYear(d.getFullYear()+1);document.cookie='sf_tut_done=1;expires='+d.toUTCString()+';path=/;SameSite=Lax'}document.getElementById('tut-welcome').classList.remove('show')}
function startTutorial(){document.getElementById('tut-welcome').classList.remove('show');_tutStep=0;_tutActive=true;renderTutStep();document.getElementById('tut-overlay').classList.add('show')}
function endTutorial(){
 _tutActive=false
 document.getElementById('tut-overlay').classList.remove('show')
 document.getElementById('tut-spotlight').style.cssText=''
 closeDrawer()
 // Restaura visibilidade do botão de planos caso tenha sido forçado no mobile
 const pb=document.getElementById('nav-planos-btn')
 if(pb&&pb._tutForced){pb.style.display='';pb._tutForced=false}
 // Abre o modal de planos ao concluir o tutorial
 setTimeout(()=>openModal('planos-modal-overlay'),350)
}
function tutStep(dir){_tutStep+=dir;if(_tutStep<0)_tutStep=0;if(_tutStep>=TUT_STEPS.length){endTutorial();return}renderTutStep()}
function renderTutStep(){
 const step=TUT_STEPS[_tutStep],total=TUT_STEPS.length
 if(step.openDrawer)openDrawer();else if(step.closeDrawer)closeDrawer()
 const outerDelay=step.openDrawer?420:step.closeDrawer?320:20
 setTimeout(()=>{
 const el=document.getElementById(step.targetId);if(!el)return
 // Força visibilidade de elementos ocultos em mobile (ex: nav-planos-btn)
 if(step.forceShow&&el.offsetParent===null){el.style.display='flex';el._tutForced=true}
 // Scroll dentro do drawer se necessário
 const drawer=document.getElementById('drawer')
 if(drawer&&drawer.contains(el)){
  const db=drawer.querySelector('.drawer-body')||drawer
  db.scrollTop=Math.max(0,el.offsetTop-db.offsetTop-60)
 }else{
  el.scrollIntoView({behavior:'smooth',block:'nearest'})
 }
 setTimeout(()=>{
 const r=el.getBoundingClientRect(),PAD=8
 if(r.width===0&&r.height===0){setTimeout(()=>renderTutStep(),200);return}
 const sp=document.getElementById('tut-spotlight')
 // overlay é position:fixed;inset:0 - coordenadas já são relativas ao viewport, sem scrollY
 sp.style.top=(r.top-PAD)+'px';sp.style.left=(r.left-PAD)+'px'
 sp.style.width=(r.width+PAD*2)+'px';sp.style.height=(r.height+PAD*2)+'px'
 const card=document.getElementById('tut-card'),cardW=270,vw=window.innerWidth,vh=window.innerHeight
 const cardH=200 // altura aproximada do card para clamp vertical
 let left,top
 if(step.pos==='right'){left=r.right+12;top=r.top;if(left+cardW>vw-8)left=r.left-cardW-12}
 else{left=Math.min(r.left,vw-cardW-8);top=r.bottom+12}
 // clamp: card nunca sai da viewport
 left=Math.max(8,Math.min(left,vw-cardW-8))
 top=Math.max(8,Math.min(top,vh-cardH-8))
 card.style.left=left+'px';card.style.top=top+'px';card.style.maxWidth=Math.min(cardW,vw-16)+'px'
 document.getElementById('tut-num').textContent=_tutStep+1
 document.getElementById('tut-total').textContent='de '+total
 document.getElementById('tut-title').textContent=step.title
 document.getElementById('tut-desc').textContent=step.desc
 document.getElementById('tut-progress').innerHTML=TUT_STEPS.map((_,i)=>`<div class="tut-prog-dot ${i<=_tutStep?'done':''}"></div>`).join('')
 document.getElementById('tut-prev').style.display=_tutStep===0?'none':'block'
 document.getElementById('tut-next').textContent=_tutStep===total-1?' Concluir':'Próximo →'
 },step.closeDrawer?300:120)
 },outerDelay)
}
window.addEventListener('load',()=>{if(!document.cookie.split(';').some(c=>c.trim().startsWith('sf_tut_done=')))setTimeout(()=>showTutWelcome(),900)})
document.addEventListener('keydown',e=>{if(!_tutActive)return;if(e.key==='ArrowRight'||e.key==='Enter')tutStep(1);if(e.key==='ArrowLeft')tutStep(-1)})
