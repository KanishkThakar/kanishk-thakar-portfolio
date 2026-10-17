'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const ui = Object.fromEntries(['start','stop','mic','voice','consent','timer','status','orb','progress','message','send','transcript','interim','sample','session-label'].map(id => [id,$(id)]));
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let active = false, deadline = 0, clock = null, recognition = null, listening = false, spoken = true, speaking = false, generation = 0, turn = 0, context = '';
  const sessionLength = 30000;
  const replyAudio = new Audio(); replyAudio.id = 'reply-audio'; replyAudio.hidden = true; replyAudio.preload = 'none'; document.body.append(replyAudio);
  const replyManifest = fetch('voice-replies.json').then(r => { if (!r.ok) throw new Error('Audio index unavailable'); return r.json(); }).catch(() => ({}));
  function status(text) { ui.status.textContent = text; }
  function renderControls() {
    ui.start.disabled = active; ui.stop.disabled = !active;
    ui.message.disabled = !active; ui.send.disabled = !active;
    ui.mic.disabled = !active || !Recognition;
    ui.mic.textContent = listening ? 'Stop microphone' : 'Turn microphone on';
    ui.mic.setAttribute('aria-pressed', String(listening));
    ui.orb.classList.toggle('listening',listening);ui.orb.classList.toggle('speaking',speaking);
  }
  function stopListening() {
    const old = recognition; recognition = null; listening = false;
    if (old) { old.onresult = null; old.onerror = null; old.onend = null; try { old.abort(); } catch (_) {} }
    ui.interim.textContent = ''; renderControls();
  }
  function stopPlayback() { generation++; replyAudio.pause(); replyAudio.removeAttribute('src'); replyAudio.load(); window.speechSynthesis?.cancel(); speaking = false; ui.sample.pause(); renderControls(); }
  function finish(message = 'Session complete. Your microphone and playback are stopped.') {
    active = false; clearInterval(clock); clock = null; stopListening(); stopPlayback();
    ui['session-label'].textContent = 'SESSION ENDED'; ui.start.textContent = 'Start another 30 seconds ↗'; status(message); renderControls();
  }
  function tick() {
    if (!active) return;
    const remaining = Math.max(0, deadline - Date.now()); const seconds = Math.ceil(remaining/1000);
    ui.timer.textContent = '00:' + String(seconds).padStart(2,'0'); ui.timer.setAttribute('aria-label', seconds + ' seconds remaining'); ui.progress.style.width = remaining/sessionLength*100 + '%';
    if (remaining <= 0) finish();
  }
  function append(role,text) {
    ui.transcript.querySelector('.empty')?.remove();
    const item=document.createElement('div');item.className='message '+role;
    const label=document.createElement('strong'); label.textContent=role==='user'?'YOU':'SOUL YATRI · GUIDED PREVIEW';
    const body=document.createElement('span');body.textContent=text;item.append(label,body);ui.transcript.append(item);ui.transcript.scrollTop=ui.transcript.scrollHeight;
  }
  function respond(input) {
    const text=input.toLowerCase(); const earlier=context;
    if (/\b(rumik|model|architecture|pipeline|how does|how.*work|real system|speech|voice)\b/.test(text) && !/\b(private|privacy|save|record|data|cloud|secure)\b/.test(text)) {
      context='architecture';
      if (/browser|preview/.test(text)) return 'This page uses browser speech recognition and prerecorded synthetic narration with written responses. The separate sample below comes from my local voice prototype. The full conversation service is not connected to this preview.';
      return 'The Soul Yatri voice prototype has three stages: speech recognition turns audio into text, a language model writes the reply, and speech synthesis reads it aloud. It runs locally. Would you like the privacy details or the difference from this preview?';
    }
    if (/\b(private|privacy|save|record|data|cloud|secure)\b/.test(text)) { context='privacy';return 'This page keeps the transcript only in memory and clears it when you restart or leave. Browser recognition may process speech through your browser provider. The local Soul Yatri runtime is a separate offline system; it is not receiving this conversation.'; }
    if (/\b(kanishk|builder|built|portfolio|projects|who are|your name)\b/.test(text)) {context='projects';return 'I am a guided preview of Kanishk’s voice interface. His work connects Soul Yatri, local speech systems, and a package-scanning project. He works across finance, operations and partnerships at Soul Yatri. Which project interests you?';}
    if (/\b(scanner|scanning|ocr|package|metrology)\b/.test(text)) {context='scanner';return 'The metrology scanner explores reading product packages from multiple photos. Its stack includes Next.js, Expo, FastAPI, PaddleOCR and Tesseract. A useful challenge is separating readable label text from uncertain OCR, so the user can verify it.';}
    if (/\b(soul yatri|business|finance|founder|startup)\b/.test(text)) {context='business';return 'Kanishk is a co-founder and CFO at Soul Yatri, working on finance, operations, partnerships and business planning. His portfolio connects that work with hands-on AI experiments. We can explore the voice architecture or the product-building process.';}
    if (/\b(build|idea|product|app|design|prototype)\b/.test(text)) {context='build';return 'Start with one person, one problem and one action the interface should make easier. Then build the smallest working flow and watch someone use it. For a voice app, I would first test microphone permission, turn-taking and a clear stop control.';}
    if (/\b(language|hindi|gujarati|english|bengali)\b/.test(text)) {context='language';return 'The local voice work includes English, Hindi and Gujarati routing, with Bengali work in Human Graph. This small browser preview uses English recognition. Language availability here depends on your browser, not the local voice prototype.';}
    if (/\b(hello|hi|hey|good morning|namaste)\b/.test(text)) return 'Hi. You have thirty seconds to explore. Ask about the voice pipeline, Kanishk’s projects, or one practical step for something you are building.';
    if (/\b(thanks|thank you|great|cool|nice)\b/.test(text)) return 'You’re welcome. You can replay the studio voice sample below or open another working experiment from the portfolio.';
    if (/\b(why|tell me more|difference|yes|explain|next)\b/.test(text) && earlier==='architecture') return 'Recognition, reasoning and speech are separate models in the local application. That lets each stage be tested independently, but it also adds latency. This browser preview demonstrates the interaction; it does not reproduce that inference pipeline.';
    return 'I can help explore the voice architecture, Kanishk’s projects, privacy, or a practical first step for a product idea. This is a guided demo with written responses, so I may not understand an open-ended question. Which of those would you like to try?';
  }
  async function speak(text) {
    if (!spoken || !active) return;
    stopPlayback(); const id = generation;
    const manifest = await replyManifest;
    if (id !== generation || !active || !spoken || Date.now() >= deadline) return;
    const file = manifest[text];
    if (!file) { status('Audio unavailable. Your reply is in the transcript.'); return; }
    replyAudio.src = file;
    replyAudio.onplaying = () => { if (id !== generation || !active) return; speaking = true; status('Speaking. You can interrupt with another message.'); renderControls(); };
    replyAudio.onended = () => { if (id !== generation) return; speaking = false; if (active) status('Your turn. Turn the microphone on or type another message.'); renderControls(); };
    const failed = () => { if (id !== generation) return; speaking = false; if (active) status('Spoken playback is unavailable. Your reply is in the transcript.'); renderControls(); };
    replyAudio.onerror = failed;
    try { await replyAudio.play(); } catch (_) { failed(); }
  }
  function submit(value) {
    if (!active || Date.now()>=deadline) {tick();return;}
    const text=value.trim().slice(0,350);if(!text)return;
    stopListening();stopPlayback();append('user',text);ui.message.value='';turn++;
    const reply=respond(text);append('assistant',reply);status('Reply ready. Turn the microphone on or type to continue.');speak(reply);
  }
  function start() {
    stopListening();stopPlayback();active=true;deadline=Date.now()+sessionLength;turn=0;context='';ui.transcript.replaceChildren();ui['session-label'].textContent='30-SECOND SESSION';
    const greeting = "Hi. You have thirty seconds to explore. Ask about the voice pipeline, Kanishk\u2019s projects, or one practical step for something you are building."; append('assistant',greeting);
    status(Recognition?'Your session is running. Turn on the microphone or type a message.':'Speech recognition is unavailable in this browser. Type a message below.');renderControls();tick();clock=setInterval(tick,100);ui.message.focus();speak(greeting);
  }
  function startListening() {
    if(!active||!Recognition)return;if(!ui.consent.checked){status('Read and check the microphone consent to enable listening. Typing is ready now.');ui.consent.focus();return;}if(listening){stopListening();status('Microphone stopped. You can type or turn it on again.');return;}
    stopPlayback();const instance=new Recognition();recognition=instance;instance.lang='en-IN';instance.interimResults=true;instance.continuous=false;instance.maxAlternatives=1;listening=true;
    instance.onresult=(event)=>{
      if(instance!==recognition||!active)return;let final='',interim='';
      for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0]?.transcript||'';if(event.results[i].isFinal)final+=text;else interim+=text;}
      ui.interim.textContent=interim;if(final.trim())submit(final);
    };
    instance.onerror=(event)=>{if(instance!==recognition)return;stopListening();const messages={'not-allowed':'Microphone permission was denied. You can still type your message.','service-not-allowed':'Your browser’s recognition service is unavailable. Please type below.','audio-capture':'No microphone is available. Please type below.','no-speech':'No speech detected. Try again or type below.','network':'Speech recognition could not connect. Please type below.','language-not-supported':'English recognition is unavailable. Please type below.'};if(active)status(messages[event.error]||'Listening stopped. Try again or type your message.');};
    instance.onend=()=>{if(instance!==recognition)return;recognition=null;listening=false;ui.interim.textContent='';if(active&&!speaking)status('Microphone stopped. Turn it on again or type to continue.');renderControls();};
    try{instance.start();status('Listening. Say one sentence; the microphone stops before the reply.');renderControls();}catch(_){stopListening();status('Microphone could not start. Please type your message.');}
  }
  ui.start.addEventListener('click',start);ui.stop.addEventListener('click',()=>finish('Session ended. Microphone and playback stopped.'));
  ui.mic.addEventListener('click',startListening);$('message-form').addEventListener('submit',event=>{event.preventDefault();submit(ui.message.value);});
  document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{if(!active){status('Start a session first, then choose a prompt.');return;}submit(button.dataset.prompt);}));
  ui.voice.addEventListener('click',()=>{spoken=!spoken;ui.voice.setAttribute('aria-pressed',String(spoken));ui.voice.textContent=spoken?'Spoken replies on':'Spoken replies off';if(!spoken)stopPlayback();});
  ui.consent.addEventListener('change',()=>{if(!ui.consent.checked){stopListening();if(active)status('Microphone consent withdrawn. You can continue by typing.');}});
  ui.sample.addEventListener('play',()=>{if(active){finish('Session ended so you can listen to the prerecorded studio sample.');ui.sample.play().catch(()=>{});}replyAudio.pause();window.speechSynthesis?.cancel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(active)finish('Session ended when this page became inactive.');else{stopListening();stopPlayback();}}});
  window.addEventListener('pagehide',()=>{if(active)finish();else{stopListening();stopPlayback();}});
  window.addEventListener('message',event=>{if(event.source!==window.parent||event.origin!==location.origin)return;if(['demo:pause','demo:stop','portfolio:pause','portfolio:deactivate','voice:stop'].includes(event.data?.type)||event.data?.active===false){finish('Session ended when this demo became inactive.');}});
  renderControls();if(!Recognition)ui.mic.title='Speech recognition is unavailable; use the text field.';
})();
