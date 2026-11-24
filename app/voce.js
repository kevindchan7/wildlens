/* Wildlens — la voce di Taylor.
   Parla (sintesi vocale) e ascolta (riconoscimento vocale).
   App Android: plugin nativi @capacitor-community/text-to-speech e speech-recognition.
   Browser: Web Speech API. Mentre parla, ogni disegno di Taylor muove la bocca. */
(function(){
const P=(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())?Capacitor.Plugins:{};
const LOC={it:'it-IT',en:'en-US',es:'es-ES'};
const lang=()=>{try{return JSON.parse(localStorage.getItem('ms-lang'))||'it'}catch(e){return'it'}};
const clean=t=>String(t||'').replace(/<[^>]+>/g,' ').replace(/[*_#`>•]/g,' ').replace(/https?:\/\/\S+/g,'').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'').replace(/\s+/g,' ').trim();
let webVoice=null;
function pickVoice(){if(!('speechSynthesis'in window))return null;const l=LOC[lang()];const vs=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.replace('_','-').toLowerCase().startsWith(l.slice(0,2)));
 const fem=/female|donna|mujer|alice|elsa|federica|paola|isabella|monica|paulina|helena|laura|samantha|victoria|karen|zira|google/i;return vs.find(v=>fem.test(v.name)&&/natural|neural|enhanced|premium|google/i.test(v.name))||vs.find(v=>fem.test(v.name))||vs[0]||null}
if('speechSynthesis'in window){speechSynthesis.onvoiceschanged=()=>{webVoice=pickVoice()};webVoice=pickVoice()}
function talking(on){document.documentElement.classList.toggle('tay-talking',!!on)}
let speaking=false,queueId=0;
async function speak(text){const t=clean(text);if(!t)return;stop();const id=++queueId;speaking=true;talking(true);
 try{
  if(P.TextToSpeech){await P.TextToSpeech.speak({text:t,lang:LOC[lang()],rate:1.0,pitch:1.08,volume:1.0,category:'playback'})}
  else if('speechSynthesis'in window){await new Promise(res=>{const u=new SpeechSynthesisUtterance(t);u.lang=LOC[lang()];webVoice=webVoice||pickVoice();if(webVoice)u.voice=webVoice;u.rate=1.02;u.pitch=1.1;u.onend=u.onerror=res;speechSynthesis.speak(u);
    /* Chrome a volte si ferma sui testi lunghi */const k=setInterval(()=>{if(!speechSynthesis.speaking){clearInterval(k);res()}else{speechSynthesis.pause();speechSynthesis.resume()}},10000)})}
 }catch(e){}
 if(id===queueId){speaking=false;talking(false)}}
function stop(){queueId++;speaking=false;talking(false);try{P.TextToSpeech?P.TextToSpeech.stop():('speechSynthesis'in window&&speechSynthesis.cancel())}catch(e){}}
const canListen=()=>!!(P.SpeechRecognition||window.SpeechRecognition||window.webkitSpeechRecognition);
async function listen(){stop();
 if(P.SpeechRecognition){const SR=P.SpeechRecognition;try{const a=await SR.available();if(!a.available)throw new Error('na')}catch(e){throw new Error('na')}
  const p=await SR.requestPermissions().catch(()=>({speechRecognition:'denied'}));if(p&&p.speechRecognition&&p.speechRecognition!=='granted')throw new Error('perm');
  const r=await SR.start({language:LOC[lang()],maxResults:1,partialResults:false,popup:false});return((r&&r.matches)||[])[0]||''}
 const W=window.SpeechRecognition||window.webkitSpeechRecognition;if(!W)throw new Error('na');
 return new Promise((res,rej)=>{const r=new W();r.lang=LOC[lang()];r.interimResults=false;r.maxAlternatives=1;let got='';r.onresult=e=>{got=e.results[0][0].transcript};r.onerror=e=>rej(new Error(e.error==='not-allowed'?'perm':e.error||'err'));r.onend=()=>res(got);r.start()})}
const on=()=>{try{return JSON.parse(localStorage.getItem('wl-voice'))!==false}catch(e){return true}};
const setOn=v=>{try{localStorage.setItem('wl-voice',JSON.stringify(!!v))}catch(e){}if(!v)stop()};
window.WLVoice={speak,stop,listen,canListen,on,setOn,clean,get speaking(){return speaking}};
})();
