/* Wildlens — controllo accessi.
   Al primo avvio chiede nome + email (serve internet una volta), poi a ogni apertura
   avvisa il Gestionale. Se lo sviluppatore blocca il dispositivo o chiude l'accesso a tutti,
   l'app mostra la schermata di blocco. Offline funziona fino a GRACE_DAYS giorni dall'ultimo controllo. */
(function(){
const SB='https://lrdiktrvtzhucsujhtfd.supabase.co';
const KEY='sb_publishable_QN0qyjbHmvfvGX6E8tIPSw_rUVRh-o5';
const VER='0.2.0';
const GRACE_DAYS=30, RECHECK_MIN=15;
const SK='wl-acc';
const get=()=>{try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return{}}};
const put=v=>{try{localStorage.setItem(SK,JSON.stringify(v))}catch(e){}};
const lang=(()=>{try{const l=JSON.parse(localStorage.getItem('ms-lang'));if(l)return l}catch(e){}const n=(navigator.language||'').slice(0,2);return['it','es'].includes(n)?n:'en'})();
const T={
 welcome:['Welcome to Wildlens','Benvenuto in Wildlens','Bienvenido a Wildlens'],
 intro:['Enter your name and email to start. You only do this once: after that Wildlens works offline too.','Inserisci nome ed email per iniziare. Lo fai una volta sola: dopo Wildlens funziona anche offline.','Escribe tu nombre y email para empezar. Solo una vez: después Wildlens funciona también sin conexión.'],
 name:['Name','Nome','Nombre'],email:['Email','Email','Email'],start:['Start','Inizia','Empezar'],
 bad:['Enter your name and a valid email.','Inserisci il nome e un’email valida.','Escribe tu nombre y un email válido.'],
 net:['The first start needs internet. Connect and try again.','Il primo avvio richiede internet. Collegati e riprova.','El primer inicio necesita internet. Conéctate e inténtalo de nuevo.'],
 locked:['Access closed','Accesso chiuso','Acceso cerrado'],
 lockedTxt:['Access to Wildlens has been closed for this device. For information contact the developer.','L’accesso a Wildlens è stato chiuso per questo dispositivo. Per informazioni contatta lo sviluppatore.','El acceso a Wildlens se ha cerrado para este dispositivo. Para información contacta al desarrollador.'],
 paused:['Wildlens is paused','Wildlens è in pausa','Wildlens está en pausa'],
 pausedTxt:['The app is temporarily closed. Try again later.','L’app è momentaneamente chiusa. Riprova più tardi.','La app está cerrada temporalmente. Inténtalo más tarde.'],
 verify:['Connect to verify','Collegati per verificare','Conéctate para verificar'],
 verifyTxt:['Wildlens has been offline for a long time. Connect to the internet once to keep using it.','Wildlens è offline da molto tempo. Collegati a internet una volta per continuare a usarla.','Wildlens lleva mucho tiempo sin conexión. Conéctate una vez para seguir usándola.'],
 retry:['Try again','Riprova','Reintentar'],
 privacy:['Your name and email are used only to manage access to the app.','Nome ed email servono solo a gestire l’accesso all’app.','Tu nombre y email se usan solo para gestionar el acceso a la app.']
};
const t=k=>T[k][lang==='it'?1:lang==='es'?2:0];
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)));
const native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const platform=()=>{const ua=navigator.userAgent;const os=/iPhone|iPad/.test(ua)?'iPhone':/Android/.test(ua)?'Android':/Mac/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':'Altro';return(native?'App ':'Web ')+os};

let st=get();if(!st.id){st.id=uuid();put(st)}

const css=`#wlGate{position:fixed;inset:0;z-index:99999;background:#14201a;color:#efe9dd;display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit}
#wlGate .b{max-width:380px;width:100%;text-align:center}#wlGate h2{margin:12px 0 8px;font-size:26px;color:#fff}#wlGate p{opacity:.85;line-height:1.45;margin:0 0 16px}
#wlGate input{width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #3b4d40;background:#0e1712;color:#fff;font-size:17px;margin:0 0 10px}
#wlGate button{width:100%;padding:15px;border:0;border-radius:12px;background:#d9b46a;color:#14201a;font-weight:700;font-size:17px;margin-top:4px}
#wlGate small{display:block;opacity:.6;margin-top:14px}#wlGate .err{color:#f0a08a;min-height:20px;font-size:14px;margin:4px 0}`;
function show(html){let g=document.getElementById('wlGate');if(!g){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);g=document.createElement('div');g.id='wlGate';document.body.appendChild(g)}g.innerHTML='<div class="b"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d9b46a" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'+html+'</div>';document.body.style.overflow='hidden';return g}
function hide(){const g=document.getElementById('wlGate');if(g){g.remove();document.body.style.overflow=''}}

async function ping(extra){
 const r=await fetch(SB+'/rest/v1/rpc/wl_ping',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},
  body:JSON.stringify(Object.assign({p_id:st.id,p_piattaforma:platform(),p_lingua:lang,p_versione:VER},extra||{}))});
 if(!r.ok)throw new Error('http '+r.status);return r.json()}

function apply(res){
 st=get();st.lastCheck=Date.now();st.msg=res.messaggio||'';st.blocked=!res.ok;st.closedAll=!!res.chiuso;if(res.ok)st.lastOk=Date.now();put(st);
 render()}

function render(){
 st=get();
 if(!st.email)return regScreen();
 if(st.blocked){const all=st.closedAll;return show(`<h2>${t(all?'paused':'locked')}</h2><p>${st.msg?esc(st.msg):t(all?'pausedTxt':'lockedTxt')}</p><button id="wlRetry">${t('retry')}</button>`).querySelector('#wlRetry').onclick=check}
 if(!st.lastOk||Date.now()-st.lastOk>GRACE_DAYS*864e5)return show(`<h2>${t('verify')}</h2><p>${t('verifyTxt')}</p><button id="wlRetry">${t('retry')}</button>`).querySelector('#wlRetry').onclick=check;
 hide()}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function regScreen(){
 const g=show(`<h2>${t('welcome')}</h2><p>${t('intro')}</p><input id="wlN" autocomplete="name" placeholder="${t('name')}"><input id="wlE" type="email" autocomplete="email" inputmode="email" placeholder="${t('email')}"><div class="err" id="wlErr"></div><button id="wlGo">${t('start')}</button><small>${t('privacy')}</small>`);
 g.querySelector('#wlGo').onclick=async()=>{
  const n=g.querySelector('#wlN').value.trim(),e=g.querySelector('#wlE').value.trim(),err=g.querySelector('#wlErr');
  if(n.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)){err.textContent=t('bad');return}
  const b=g.querySelector('#wlGo');b.disabled=true;b.textContent='…';
  try{const res=await ping({p_nome:n,p_email:e});st=get();st.nome=n;st.email=e;put(st);apply(res)}
  catch(x){err.textContent=t('net');b.disabled=false;b.textContent=t('start')}}}

let busy=false;
async function check(){if(busy||!navigator.onLine){render();return}busy=true;try{apply(await ping(st.email?{p_nome:st.nome,p_email:st.email}:null))}catch(e){render()}finally{busy=false}}

render();check();
setInterval(check,RECHECK_MIN*6e4);
window.addEventListener('online',check);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-(get().lastCheck||0)>6e4)check()});
window.WL_ACCESS={check,id:()=>st.id};
})();
