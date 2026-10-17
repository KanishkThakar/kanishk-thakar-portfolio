// Click-initiated reference music, optional portfolio narration, and real inline demos.
(()=>{
const music=document.querySelector('#soundtrack'),intro=document.querySelector('#sound-intro'),sound=document.querySelector('#sound-button'),voice=document.querySelector('#narration-button'),status=document.querySelector('#audio-status'),narrator=document.querySelector('#narrator');
let narration=false,busy=false,noticeTimer,chapterTimer,spoken=new Set(),current='home',request=0,soundOn=false,firstPlay=true,mixTimer;
const chapters=new Set(['home','vision','skills','experiments','about','perspectives','learning','contact']);
function notice(text){clearTimeout(noticeTimer);status.textContent=text;if(text)noticeTimer=setTimeout(()=>status.textContent='',5000)}
function musicUI(){sound.textContent=soundOn?'SOUND ON':'SOUND OFF';sound.setAttribute('aria-pressed',String(soundOn));sound.setAttribute('aria-label',soundOn?'Pause music':'Play music')}
function mix(){const duck=narrator.paused?1:.25,fade=intro.paused?1:Math.max(0,Math.min(1,(intro.currentTime-5)/5));intro.volume=.65*(1-fade)*duck;music.volume=.65*fade*duck}
function pauseMusic(){soundOn=false;intro.pause();music.pause();clearInterval(mixTimer);musicUI()}
async function playMusic(){soundOn=true;musicUI();try{if(firstPlay){firstPlay=false;intro.currentTime=0;intro.volume=.65;music.volume=0;await Promise.all([intro.play(),music.play()])}else{music.volume=.65;await music.play()}clearInterval(mixTimer);mixTimer=setInterval(mix,100)}catch{pauseMusic();notice('Tap SOUND OFF to start the music.')}}
for(const track of [music,intro])track.addEventListener('error',()=>{pauseMusic();notice('Music could not load. Tap Sound to retry.')});
sound.onclick=async()=>{if(busy)return;if(soundOn){pauseMusic();return}busy=true;try{await playMusic()}finally{busy=false}};
function voiceUI(){voice.textContent=narration?'VOICE ON':'VOICE OFF';voice.setAttribute('aria-pressed',String(narration));voice.setAttribute('aria-label',narration?'Turn narration off':'Enable narration');voice.title=narration?'Turn narration off':'Hear this section narrated'}
function stopVoice(){request++;narrator.pause();voice.dataset.speaking='false';mix()}
narrator.addEventListener('playing',()=>{mix();voice.dataset.speaking='true'});narrator.addEventListener('ended',()=>{mix();voice.dataset.speaking='false'});
narrator.addEventListener('error',()=>{mix();voice.dataset.speaking='false';narration=false;voiceUI();notice('Narration could not load. Tap Voice to retry.')});
async function speak(id){if(!narration||!chapters.has(id))return;stopVoice();const token=request;narrator.src='assets/narration/'+id+'.mp3';try{await narrator.play();if(token===request)spoken.add(id)}catch{if(token!==request)return;narration=false;voiceUI();mix();notice('Tap VOICE OFF to start the narrator.')}}
function findChapter(){for(const s of document.querySelectorAll('main>section,main>footer')){const r=s.getBoundingClientRect();if(r.top<=innerHeight*.4&&r.bottom>innerHeight*.4){current=s.id;break}}}
voice.onclick=()=>{findChapter();narration=!narration;voiceUI();if(narration)speak(current);else stopVoice()};
document.querySelector('#enter').onclick=()=>{enter();playMusic();narration=true;voiceUI();speak('home')};document.querySelector('#enter-silent').onclick=()=>{enter();pauseMusic();narration=false;stopVoice();voiceUI()};
addEventListener('scroll',()=>{clearTimeout(chapterTimer);chapterTimer=setTimeout(()=>{findChapter();if(!document.hidden&&narration&&!spoken.has(current))speak(current)},1000)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseMusic();stopVoice();narration=false;voiceUI()}});
for(const link of document.querySelectorAll('a[href="journey.html"]'))link.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();try{sessionStorage.setItem('kt-journey-enter','1');sessionStorage.setItem('kt-journey-sound',soundOn?'1':'0')}catch{}stopVoice();document.body.classList.add('route-leaving');if(soundOn){const whoosh=new Audio('assets/audio/woosh-1.mp3');whoosh.volume=.5;whoosh.play().catch(()=>{})}setTimeout(()=>location.href=link.href,matchMedia('(prefers-reduced-motion: reduce)').matches?0:1800)});
const tabs=[...document.querySelectorAll('[data-demo]')],names={'soul-yatri':'Soul Yatri',voice:'Soul Yatri Voice',intelligence:'Intelligence Observatory'};
function chooseDemo(button){stopVoice();narration=false;voiceUI();pauseMusic();for(const t of tabs){t.setAttribute('aria-selected',String(t===button));t.tabIndex=t===button?0:-1}const id=button.dataset.demo;document.querySelector('#live-demo').src='demos/'+id+'.html';document.querySelector('#live-demo').title=names[id]+' interactive demo';document.querySelector('#demo-panel').setAttribute('aria-labelledby',button.id);document.querySelector('#demo-fullscreen').href='demos/'+id+'.html'}
document.querySelectorAll('[data-preview]').forEach(a=>a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();const tab=tabs.find(t=>t.dataset.demo===a.dataset.preview);chooseDemo(tab);document.querySelector('.demo-playground').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});}));
document.querySelector('#live-demo').addEventListener('mouseenter',()=>{if(narration){stopVoice();narration=false;voiceUI()}if(soundOn)pauseMusic()});
tabs.forEach((t,i)=>{t.onclick=()=>chooseDemo(t);t.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();chooseDemo(tabs[n]);tabs[n].focus()}}});voiceUI();musicUI();
})();
