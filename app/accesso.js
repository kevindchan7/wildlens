/* Tent Mate — benvenuto e controllo accessi.
   1) Primo avvio: schermata con il brand e Taylor, scelta lingua e tema (giorno/notte/auto).
   2) Registrazione: nome + email (email controllata: formato, refusi, dominio che esiste davvero).
      Se l'email è già registrata da un altro telefono, Taylor la riconosce.
   3) A ogni apertura avvisa il Gestionale; se lo sviluppatore blocca la persona o chiude a tutti,
      compare la schermata di blocco. Offline funziona fino a GRACE_DAYS giorni dall'ultimo controllo. */
(function(){
const SB='https://lrdiktrvtzhucsujhtfd.supabase.co';
const KEY='sb_publishable_QN0qyjbHmvfvGX6E8tIPSw_rUVRh-o5';
const VER='0.3.0';
const GRACE_DAYS=30, RECHECK_MIN=15;
const SK='wl-acc';
const get=()=>{try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return{}}};
const put=v=>{try{localStorage.setItem(SK,JSON.stringify(v))}catch(e){}};
const ls=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const startLang=ls('ms-lang',null);
const appLang=document.documentElement.lang||startLang||'en';
let lang=startLang||(['it','es','fr'].includes((navigator.language||'').slice(0,2))?(navigator.language||'').slice(0,2):'en');

const WLFR={"tag": "Guide de terrain · fonctionne sans réseau", "hi": "Bonjour ! Je suis Taylor, votre agent de terrain. Choisissez votre langue et l'apparence de l'app : ensuite, on commence.", "langL": "Langue", "themeL": "Apparence", "day": "Jour", "night": "Nuit", "auto": "Auto", "cont": "Continuer", "by": "une app de", "askName": "Ravie de vous rencontrer ! Comment vous appelez-vous ? Je ne le demande qu'une fois.", "name": "Votre nom", "email": "Votre e-mail", "start": "Commencer", "back": "Retour", "badName": "Écrivez votre nom (au moins 2 lettres).", "badEmail": "Cet e-mail n'est pas écrit correctement.", "noDomain": "Le domaine de cet e-mail n'existe pas. Vérifiez ce que vous avez écrit.", "temp": "Les e-mails temporaires ne sont pas acceptés. Utilisez votre vrai e-mail.", "didYou": "Vouliez-vous dire", "checking": "Vérification…", "net": "Le premier démarrage nécessite internet. Connectez-vous et réessayez.", "welcomeBack": "Bon retour", "privacy": "Le nom et l'e-mail servent uniquement à gérer l'accès à l'app.", "terms": "Conditions d'utilisation", "locked": "Accès fermé", "lockedTxt": "L'accès à Tent Mate a été fermé pour ce compte. Pour plus d'informations, contactez le développeur.", "paused": "Tent Mate est en pause", "pausedTxt": "L'app est temporairement fermée. Réessayez plus tard.", "verify": "Connectez-vous pour vérifier", "verifyTxt": "Tent Mate est hors ligne depuis longtemps. Connectez-vous une fois à internet pour continuer à l'utiliser.", "retry": "Réessayer", "listen": "Écouter Taylor"};
const T={
 tag:['Field guide · works with no signal','Guida da campo · funziona senza rete','Guía de campo · funciona sin cobertura'],
 hi:["Hi! I'm Taylor, your field agent. Choose your language and how you like the app: then we start.","Ciao! Sono Taylor, la tua agente da campo. Scegli la lingua e come preferisci l'app: poi partiamo.","¡Hola! Soy Taylor, tu agente de campo. Elige el idioma y cómo prefieres la app: luego empezamos."],
 langL:['Language','Lingua','Idioma'],themeL:['Look','Aspetto','Aspecto'],
 day:['Day','Giorno','Día'],night:['Night','Notte','Noche'],auto:['Auto','Auto','Auto'],
 cont:['Continue','Continua','Continuar'],
 by:['an app by','un’app di','una app de'],
 askName:["Nice to meet you! What's your name? I'll ask only once.","Piacere! Come ti chiami? Te lo chiedo una volta sola.","¡Encantada! ¿Cómo te llamas? Solo te lo pregunto una vez."],
 name:['Your name','Il tuo nome','Tu nombre'],email:['Your email','La tua email','Tu email'],start:['Start','Inizia','Empezar'],back:['Back','Indietro','Atrás'],
 badName:['Write your name (at least 2 letters).','Scrivi il tuo nome (almeno 2 lettere).','Escribe tu nombre (al menos 2 letras).'],
 badEmail:['This email is not written correctly.','Questa email non è scritta correttamente.','Este email no está bien escrito.'],
 noDomain:['This email domain does not exist. Check what you wrote.','Il dominio di questa email non esiste. Controlla cosa hai scritto.','El dominio de este email no existe. Revisa lo que has escrito.'],
 temp:['Temporary emails are not accepted. Use your real email.','Le email temporanee non sono accettate. Usa la tua email vera.','No se aceptan emails temporales. Usa tu email real.'],
 didYou:['Did you mean','Intendevi','¿Quisiste decir'],checking:['Checking…','Controllo…','Comprobando…'],
 net:['The first start needs internet. Connect and try again.','Il primo avvio richiede internet. Collegati e riprova.','El primer inicio necesita internet. Conéctate e inténtalo de nuevo.'],
 welcomeBack:['Welcome back','Bentornato','Bienvenido de nuevo'],
 privacy:['Name and email are used only to manage access to the app.','Nome ed email servono solo a gestire l’accesso all’app.','Tu nombre y email se usan solo para gestionar el acceso a la app.'],
 terms:['Terms of use','Condizioni d’uso','Condiciones de uso'],
 locked:['Access closed','Accesso chiuso','Acceso cerrado'],
 lockedTxt:['Access to Tent Mate has been closed for this account. For information contact the developer.','L’accesso a Tent Mate è stato chiuso per questo account. Per informazioni contatta lo sviluppatore.','El acceso a Tent Mate se ha cerrado para esta cuenta. Para información contacta al desarrollador.'],
 paused:['Tent Mate is paused','Tent Mate è in pausa','Tent Mate está en pausa'],
 pausedTxt:['The app is temporarily closed. Try again later.','L’app è momentaneamente chiusa. Riprova più tardi.','La app está cerrada temporalmente. Inténtalo más tarde.'],
 verify:['Connect to verify','Collegati per verificare','Conéctate para verificar'],
 verifyTxt:['Tent Mate has been offline for a long time. Connect to the internet once to keep using it.','Tent Mate è offline da molto tempo. Collegati a internet una volta per continuare a usarla.','Tent Mate lleva mucho tiempo sin conexión. Conéctate una vez para seguir usándola.'],
 retry:['Try again','Riprova','Reintentar'],listen:['Listen to Taylor','Ascolta Taylor','Escucha a Taylor']
};
for(const k in T)if(T[k].length<4)T[k][3]=WLFR[k]||T[k][0];
const t=k=>T[k][lang==='it'?1:lang==='es'?2:lang==='fr'?3:0];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)));
const native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const platform=()=>{const ua=navigator.userAgent;const os=/iPhone|iPad/.test(ua)?'iPhone':/Android/.test(ua)?'Android':/Mac/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':'Altro';return(native?'App ':'Web ')+os};
const say=txt=>{try{window.WLVoice&&WLVoice.on()&&WLVoice.speak(txt)}catch(e){}};

let st=get();if(!st.id){st.id=uuid();put(st)}

/* ---------- aspetto ---------- */
const css=`
#wlGate{position:fixed;inset:0;z-index:99999;color:#f4efe4;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow-y:auto;-webkit-overflow-scrolling:touch;
 background:radial-gradient(120% 70% at 50% 0%,#2f5a3c 0%,#183025 45%,#0d1a13 100%)}
#wlGate .bg{position:fixed;inset:auto 0 0 0;height:42vh;pointer-events:none;opacity:.9}
#wlGate .bg svg{width:100%;height:100%;display:block}
#wlGate .m1{animation:wlDrift 18s ease-in-out infinite alternate}#wlGate .m2{animation:wlDrift 26s ease-in-out infinite alternate-reverse}
#wlGate .mist{animation:wlMist 14s linear infinite}
@keyframes wlDrift{from{transform:translateX(-14px)}to{transform:translateX(14px)}}@keyframes wlMist{from{transform:translateX(-30%)}to{transform:translateX(30%)}}
#wlGate .in{position:relative;min-height:100%;max-width:440px;margin:0 auto;padding:max(28px,env(safe-area-inset-top)) 22px max(26px,env(safe-area-inset-bottom));display:flex;flex-direction:column;box-sizing:border-box}
#wlGate.noanim .brand,#wlGate.noanim .stage,#wlGate.noanim .card{animation:none}
#wlGate .brand{display:flex;align-items:center;gap:12px;animation:wlUp .6s ease-out both}
#wlGate .brand img{width:46px;height:46px;border-radius:13px;box-shadow:0 6px 18px rgba(0,0,0,.35)}
#wlGate .brand b{font-family:"Source Serif 4",Georgia,serif;font-size:30px;font-weight:600;letter-spacing:.2px;color:#fff;display:block;line-height:1}
#wlGate .brand small{display:block;font-size:12.5px;letter-spacing:.06em;color:#d9b46a;margin-top:5px;font-weight:600}
#wlGate .stage{display:flex;align-items:flex-end;gap:10px;margin:26px 0 8px;animation:wlUp .7s .1s ease-out both}
#wlGate .tay{width:118px;height:126px;flex:none;filter:drop-shadow(0 10px 18px rgba(0,0,0,.4));cursor:pointer;-webkit-tap-highlight-color:transparent}
#wlGate .tay svg{width:100%;height:100%}
#wlGate .tay.hop{animation:wlHop .55s ease-out}
@keyframes wlHop{0%,100%{transform:none}35%{transform:translateY(-16px) rotate(-4deg)}65%{transform:translateY(0) rotate(2deg)}}
#wlGate .bub{position:relative;flex:1;background:#fbf7ef;color:#1e2a1f;border-radius:18px 18px 18px 6px;padding:13px 15px;font-size:15.5px;line-height:1.42;box-shadow:0 10px 28px rgba(0,0,0,.3);margin-bottom:34px}
#wlGate .bub .spk{position:absolute;right:-8px;top:-10px;width:34px;height:34px;border-radius:50%;border:0;background:#d9b46a;color:#14201a;font-size:16px;padding:0;box-shadow:0 4px 10px rgba(0,0,0,.3)}
#wlGate .card{background:rgba(251,247,239,.07);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:16px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:wlUp .7s .18s ease-out both}
#wlGate .lbl{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#cfd8cf;font-weight:700;margin:2px 0 8px}
#wlGate .seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;background:rgba(0,0,0,.25);border-radius:14px;padding:5px;margin-bottom:16px}
#wlGate .seg:last-child{margin-bottom:0}
#wlGate .seg button{border:0;border-radius:10px;padding:12px 4px;background:transparent;color:#e9e4d8;font-family:inherit;font-weight:600;font-size:15px;line-height:1.1;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:52px}
#wlGate .seg button span{font-size:20px;line-height:1}
#wlGate .seg button[aria-pressed=true]{background:#f4efe4;color:#183025;box-shadow:0 3px 10px rgba(0,0,0,.25)}
#wlGate input{width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1.5px solid rgba(255,255,255,.18);background:rgba(0,0,0,.28);color:#fff;font-size:17px;margin:0 0 10px;outline:none}
#wlGate input:focus{border-color:#d9b46a}
#wlGate .go{width:100%;padding:16px;border:0;border-radius:15px;background:#d9b46a;color:#14201a;font-family:inherit;font-weight:700;font-size:17px;margin-top:18px;box-shadow:0 8px 20px rgba(217,180,106,.25)}
#wlGate .go:disabled{opacity:.6}
#wlGate .ghost{background:transparent;border:0;color:#cfd8cf;font-family:inherit;font-weight:600;font-size:15px;padding:12px;margin-top:4px;width:100%}
#wlGate .err{color:#ffb3a0;min-height:20px;font-size:14px;margin:2px 0 0}
#wlGate .err button{background:none;border:0;color:#d9b46a;font-family:inherit;font-weight:700;font-size:14px;padding:0;text-decoration:underline}
#wlGate .foot{margin-top:auto;padding-top:22px;text-align:center;font-size:12.5px;color:#aab6ad;line-height:1.6}
#wlGate .foot b{color:#e9e4d8;letter-spacing:.04em}#wlGate .foot a{color:#aab6ad}
#wlGate .dots{display:flex;gap:6px;justify-content:center;margin-top:16px}#wlGate .dots i{width:7px;height:7px;border-radius:9px;background:rgba(255,255,255,.25)}#wlGate .dots i.on{width:20px;background:#d9b46a}
#wlGate h2{font-family:"Source Serif 4",Georgia,serif;font-weight:600;font-size:27px;margin:8px 0 6px;color:#fff}
#wlGate p.t{opacity:.85;line-height:1.5;margin:0 0 16px}
@keyframes wlUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#wlGate *{animation:none!important}}`;
const BG=`<div class="bg"><svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<path class="m2" d="M-40 150 L40 70 L90 120 L150 40 L220 120 L270 80 L340 140 L440 60 L440 220 L-40 220Z" fill="#244634" opacity=".55"/>
<path class="mist" d="M-100 150 Q50 130 200 150 T500 150 L500 175 L-100 175Z" fill="#ffffff" opacity=".05"/>
<path class="m1" d="M-40 190 L30 120 L80 160 L140 100 L200 170 L260 120 L320 175 L380 130 L440 180 L440 220 L-40 220Z" fill="#132a1d"/>
<g fill="#0b1912">${[20,48,70,300,330,355,380].map((x,i)=>`<path d="M${x} ${220-0} l9 -${28+i%3*8} l9 ${28+i%3*8}z"/>`).join('')}</g></svg></div>`;
function frame(inner,step){let g=document.getElementById('wlGate');if(!g){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);g=document.createElement('div');g.id='wlGate';g.setAttribute('role','dialog');document.body.appendChild(g)}
 g.innerHTML=BG+`<div class="in"><div class="brand"><img src="icon.svg" alt=""><div><b>Tent Mate</b><small>${esc(t('tag'))}</small></div></div>${inner}${step!=null?`<div class="dots">${[0,1].map(i=>`<i class="${i===step?'on':''}"></i>`).join('')}</div>`:''}<div class="foot">${t('by')} <b>ART&amp; CREATION</b><br>© 2026 ART&amp; CREATION LLC · <a href="../condizioni.html" target="_blank" rel="noopener">${t('terms')}</a></div></div>`;
 document.documentElement.style.overflow='hidden';if(g._drawn)g.classList.add('noanim');g._drawn=1;
 const tay=g.querySelector('.tay');if(tay){tay.onclick=()=>{tay.classList.remove('hop');void tay.offsetWidth;tay.classList.add('hop');const b=g.querySelector('.bub span');if(b)say(b.textContent)}}
 const spk=g.querySelector('.spk');if(spk)spk.onclick=e=>{e.stopPropagation();const b=g.querySelector('.bub span');if(b)window.WLVoice&&WLVoice.speak(b.textContent)};
 return g}
const taylor=txt=>`<div class="stage"><div class="tay" role="button" aria-label="Taylor">${window.TSPRITE?TSPRITE(true):''}</div><div class="bub"><span>${esc(txt)}</span>${window.WLVoice?`<button class="spk" aria-label="${esc(t('listen'))}">🔊</button>`:''}</div></div>`;
function hide(){const g=document.getElementById('wlGate');if(g){g.remove();document.documentElement.style.overflow=''}}

/* ---------- passo 1: lingua e tema ---------- */
function stepLook(){
 const th=ls('ms-theme','');
 const g=frame(taylor(t('hi'))+`<div class="card"><div class="lbl">${t('langL')}</div><div class="seg" id="wlL">${[['it','🇮🇹','Italiano'],['en','🇬🇧','English'],['es','🇪🇸','Español'],['fr','🇫🇷','Français']].map(([l,f,n])=>`<button data-l="${l}" aria-pressed="${l===lang}"><span>${f}</span>${n}</button>`).join('')}</div>
 <div class="lbl">${t('themeL')}</div><div class="seg" id="wlT">${[['light','☀️',t('day')],['dark','🌙',t('night')],['','📱',t('auto')]].map(([v,i,n])=>`<button data-t="${v}" aria-pressed="${v===th}"><span>${i}</span>${n}</button>`).join('')}</div></div>
 <button class="go" id="wlGo">${t('cont')} →</button>`,0);
 g.querySelector('#wlL').onclick=e=>{const b=e.target.closest('[data-l]');if(!b)return;lang=b.dataset.l;lsSet('ms-lang',lang);stepLook();say(t('hi'))};
 g.querySelector('#wlT').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;const v=b.dataset.t;try{typeof setTheme==='function'?setTheme(v):lsSet('ms-theme',v)}catch(x){lsSet('ms-theme',v)}for(const c of b.parentNode.children)c.setAttribute('aria-pressed',c===b)};
 g.querySelector('#wlGo').onclick=()=>{lsSet('ms-lang',lang);st=get();st.look=1;put(st);stepReg();say(t('askName'))};
}

/* ---------- controllo email ---------- */
const DOM=['gmail.com','googlemail.com','hotmail.com','hotmail.it','outlook.com','outlook.it','live.com','live.it','yahoo.com','yahoo.it','icloud.com','me.com','libero.it','virgilio.it','alice.it','tiscali.it','tim.it','fastwebnet.it','email.it','inwind.it','tin.it','protonmail.com','proton.me','aol.com','msn.com','gmx.com','gmx.it','pec.it'];
const TEMP=/(^|\.)(mailinator|yopmail|10minutemail|guerrillamail|guerrillamailblock|tempmail|temp-mail|trashmail|sharklasers|getnada|dispostable|maildrop|fakeinbox|throwawaymail|mintemail|mohmal|emailondeck|tempail|burnermail|spamgourmet)\./i;
function lev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function suggest(email){const [u,d]=email.split('@');if(!d)return null;if(DOM.includes(d))return null;let best=null,bd=9;for(const x of DOM){const v=lev(d,x);if(v<bd){bd=v;best=x}}
 if(bd>0&&bd<=2)return u+'@'+best;const fix=d.replace(/\.(con|cmo|ocm|cpm|vom|om|co)$/,'.com').replace(/\.(ti|itt)$/,'.it');return fix!==d?u+'@'+fix:null}
async function dns(name,type){const ctl=new AbortController();const k=setTimeout(()=>ctl.abort(),4500);
 try{for(const u of[`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`]){try{const r=await fetch(u,{headers:{accept:'application/dns-json'},signal:ctl.signal});if(r.ok)return await r.json()}catch(e){if(ctl.signal.aborted)break}}return null}finally{clearTimeout(k)}}
/* true = esiste, false = non esiste, null = non verificabile ora */
async function domainOk(d){const mx=await dns(d,'MX');if(!mx)return null;if(mx.Status===3)return false;if(mx.Status!==0)return null;if((mx.Answer||[]).some(a=>a.type===15&&!/^0 \.$/.test(a.data)))return true;const a=await dns(d,'A');if(!a)return null;return a.Status===0&&(a.Answer||[]).length>0}

/* ---------- passo 2: registrazione ---------- */
function stepReg(msg){
 const g=frame(taylor(msg||t('askName'))+`<div class="card"><input id="wlN" autocomplete="name" autocapitalize="words" placeholder="${esc(t('name'))}" value="${esc(st.nome||'')}"><input id="wlE" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="${esc(t('email'))}" value="${esc(st.emailDraft||'')}"><div class="err" id="wlErr"></div>
 <button class="go" id="wlGo">${t('start')}</button><button class="ghost" id="wlBack">← ${t('back')}</button><p style="font-size:12.5px;color:#aab6ad;text-align:center;margin:8px 0 0">${t('privacy')}</p></div>`,1);
 const $=s=>g.querySelector(s),err=$('#wlErr'),btn=$('#wlGo');
 $('#wlBack').onclick=stepLook;
 $('#wlE').addEventListener('input',()=>{err.textContent=''});
 const go=async()=>{
  const n=$('#wlN').value.trim().replace(/\s+/g,' '),e=$('#wlE').value.trim().toLowerCase();st=get();st.nome=n;st.emailDraft=e;put(st);
  if(n.length<2||!/\p{L}/u.test(n)){err.textContent=t('badName');$('#wlN').focus();return}
  if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)||/\.\./.test(e)){err.textContent=t('badEmail');$('#wlE').focus();return}
  const d=e.split('@')[1];
  if(TEMP.test(d)){err.textContent=t('temp');return}
  const s=suggest(e);if(s&&!st.ignoreSug){err.innerHTML=`${t('didYou')} <button id="wlSug">${esc(s)}</button>? <button id="wlKeep" style="color:#cfd8cf">✕</button>`;$('#wlSug').onclick=()=>{$('#wlE').value=s;err.textContent=''};$('#wlKeep').onclick=()=>{st.ignoreSug=1;put(st);err.textContent=''};return}
  if(!navigator.onLine){err.textContent=t('net');return}
  btn.disabled=true;btn.textContent=t('checking');
  const ok=await domainOk(d);if(ok===false){err.textContent=t('noDomain');btn.disabled=false;btn.textContent=t('start');return}
  try{const res=await ping({p_nome:n,p_email:e});st=get();st.nome=n;st.email=e;delete st.emailDraft;put(st);
   if(res.tornato&&res.ok){const nm=res.nome_prec||n;g.querySelector('.bub span').textContent=`${t('welcomeBack')}, ${nm}! 👋`;say(`${t('welcomeBack')}, ${nm}!`);setTimeout(()=>apply(res),1500)}else apply(res)}
  catch(x){err.textContent=t('net');btn.disabled=false;btn.textContent=t('start')}};
 btn.onclick=go;$('#wlE').onkeydown=e=>{if(e.key==='Enter')go()};$('#wlN').onkeydown=e=>{if(e.key==='Enter')$('#wlE').focus()};
}

/* ---------- blocchi ---------- */
const SOSX={emg:['EMERGENCY · ALWAYS AVAILABLE','EMERGENZA · SEMPRE DISPONIBILE','EMERGENCIA · SIEMPRE DISPONIBLE','URGENCE · TOUJOURS DISPONIBLE'],call:['Call 112','Chiama il 112','Llama al 112','Appeler le 112'],pos:['My position','La mia posizione','Mi posición','Ma position'],sms:['Send my position by SMS','Invia la posizione per SMS','Enviar mi posición por SMS','Envoyer ma position par SMS'],wait:['Finding your position…','Cerco la tua posizione…','Buscando tu posición…','Recherche de votre position…'],nopos:['Position not available: go outdoors and try again.','Posizione non disponibile: vai all’aperto e riprova.','Posición no disponible: sal al exterior e inténtalo de nuevo.','Position indisponible : sortez et réessayez.'],help:['I need help. My position:','Ho bisogno di aiuto. La mia posizione:','Necesito ayuda. Mi posición:','J’ai besoin d’aide. Ma position :'],off:['Continue offline','Continua offline','Continuar sin conexión','Continuer hors ligne'],offT:['You can keep using Tent Mate with no signal. We will verify the next time you are online.','Puoi continuare a usare Tent Mate senza campo. Verificheremo la prossima volta che sei online.','Puedes seguir usando Tent Mate sin cobertura. Verificaremos la próxima vez que tengas conexión.','Vous pouvez continuer à utiliser Tent Mate sans réseau. Nous vérifierons la prochaine fois que vous serez en ligne.']};
const tx=k=>SOSX[k][lang==='it'?1:lang==='es'?2:lang==='fr'?3:0];
function stepMsg(title,txt,soft){const g=frame(taylor(title)+`<div class="card"><h2>${esc(title)}</h2><p class="t">${esc(txt)}</p><button class="go" id="wlRetry">${t('retry')}</button>${soft?`<button class="go" id="wlOff" style="background:transparent;color:inherit;border:1.5px solid currentColor;margin-top:8px">${tx('off')}</button><p class="t" style="font-size:13px;opacity:.8">${tx('offT')}</p>`:''}</div>
<div class="card" style="border:2px solid #b8432c"><div class="lbl" style="color:#b8432c">🆘 ${tx('emg')}</div><a class="go" href="tel:112" style="display:block;text-align:center;background:#b8432c;color:#fff;text-decoration:none">📞 ${tx('call')}</a><button class="go" id="wlPos" style="background:transparent;color:inherit;border:1.5px solid currentColor;margin-top:8px">📍 ${tx('pos')}</button><p class="t" id="wlPosT" style="font-size:15px"></p></div>`);
 g.querySelector('#wlRetry').onclick=()=>{g.querySelector('#wlRetry').textContent='…';check()};
 if(soft)g.querySelector('#wlOff').onclick=()=>{const s=get();s.softUntil=Date.now()+3*864e5;put(s);release()};
 g.querySelector('#wlPos').onclick=()=>{const o=g.querySelector('#wlPosT');o.textContent=tx('wait');if(!navigator.geolocation){o.textContent=tx('nopos');return}navigator.geolocation.getCurrentPosition(p=>{const la=p.coords.latitude.toFixed(5),lo=p.coords.longitude.toFixed(5),msg=tx('help')+' '+la+', '+lo+' https://maps.google.com/?q='+la+','+lo;o.innerHTML=`<b style="font-size:20px">${la}, ${lo}</b><br>± ${Math.round(p.coords.accuracy)} m<br><a class="go" style="display:block;text-align:center;margin-top:8px;text-decoration:none" href="sms:?body=${encodeURIComponent(msg)}">✉ ${tx('sms')}</a>`},()=>{o.textContent=tx('nopos')},{enableHighAccuracy:true,timeout:20000,maximumAge:60000})}}

/* ---------- server ---------- */
async function ping(extra){
 const r=await fetch(SB+'/rest/v1/rpc/wl_ping',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},
  body:JSON.stringify(Object.assign({p_id:st.id,p_piattaforma:platform(),p_lingua:lang,p_versione:VER},extra||{}))});
 if(!r.ok)throw new Error('http '+r.status);return r.json()}
function apply(res){st=get();st.lastCheck=Date.now();st.msg=res.messaggio||'';st.blocked=!res.ok;st.closedAll=!!res.chiuso;if(res.ok)st.lastOk=Date.now();put(st);render()}

let released=false;
function release(){hide();if(released)return;released=true;
 if(ls('ms-lang',appLang)!==appLang&&!sessionStorage.getItem('wl-rl')){sessionStorage.setItem('wl-rl','1');location.reload();return}
 try{window.WL_AFTER_GATE&&WL_AFTER_GATE()}catch(e){}}
function render(){
 st=get();lang=ls('ms-lang',lang);
 if(!st.email)return st.look?stepReg():stepLook();
 if(st.blocked){const all=st.closedAll;return stepMsg(t(all?'paused':'locked'),st.msg||t(all?'pausedTxt':'lockedTxt'))}
 if((!st.lastOk||Date.now()-st.lastOk>GRACE_DAYS*864e5)&&!(st.softUntil>Date.now()))return stepMsg(t('verify'),t('verifyTxt'),true);
 release()}

let busy=false;
async function check(){if(busy)return;if(!navigator.onLine||!get().email){if(!document.getElementById('wlGate')||get().email)render();return}busy=true;try{apply(await ping({p_nome:st.nome,p_email:st.email}))}catch(e){render()}finally{busy=false}}

render();if(st.email)check();
setInterval(()=>{if(get().email)check()},RECHECK_MIN*6e4);
window.addEventListener('online',()=>{if(get().email)check()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&get().email&&Date.now()-(get().lastCheck||0)>6e4)check()});
window.WL_ACCESS={check,id:()=>st.id};
})();
