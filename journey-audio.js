/* Journey sound transport: one narrator, cancellable ambience, gesture-only resume. */
(() => {
  'use strict';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number(v) || 0));
  const narration = ['home', 'vision', 'skills', 'experiments', 'about', 'perspectives', 'learning', 'contact'];
  function create({onState = () => {}, onVoiceProgress = () => {}, onVoiceEnd = () => {}} = {}) {
    const tracks = new Map();
    let context, enabled = false, muted = true, suspended = false, destroyed = false;
    let chapter = 0, epoch = 0, voice = null, ambient = '', transition = null, error = null;
    let voiceEnvelope = 1, twinEnvelope = 0;
    const allowed = () => enabled && !muted && !suspended && !destroyed && !document.hidden;
    const state = () => ({enabled, muted, suspended, chapter, ambient, error,
      voice: voice ? {kind: voice.kind, index: voice.index, playing: !voice.track.audio.paused} : null});
    function emit() { onState(state()); }
    function graph(track) {
      if (!context || track.gain) return;
      try {
        track.source = context.createMediaElementSource(track.audio);
        track.filter = context.createBiquadFilter();
        track.filter.type = 'lowpass'; track.filter.frequency.value = 10000;
        track.gain = context.createGain(); track.gain.gain.value = 0;
        track.source.connect(track.filter); track.filter.connect(track.gain); track.gain.connect(context.destination);
        track.audio.volume = 1;
      } catch (_) { /* HTMLAudio volume remains a usable fallback. */ }
    }
    function get(name, role = 'effect', folder = 'audio') {
      const key = folder + '/' + name;
      if (tracks.has(key)) return tracks.get(key);
      const audio = new Audio('assets/' + key + '.mp3');
      audio.preload = role === 'voice' ? 'metadata' : 'auto'; audio.hidden = true;
      audio.id = 'journey-audio-' + name; audio.dataset.track = name; audio.dataset.role = role;
      audio.dataset.level = '0'; audio.dataset.target = '0'; audio.dataset.playing = 'false';
      audio.volume = 0; audio.loop = role === 'loop'; document.body.append(audio);
      const track = {audio, role, name, level: 0, target: 0, ramp: .6, token: 0, epoch: 0, pending: false};
      tracks.set(key, track); graph(track);
      return track;
    }
    function volume(track, level, immediate = false) {
      level = clamp(level); track.audio.dataset.level = level.toFixed(4);
      if (track.gain && context) {
        const param = track.gain.gain, now = context.currentTime;
        if (immediate) { param.cancelScheduledValues(now); param.setValueAtTime(level, now); }
        else param.setTargetAtTime(level, now, .035);
      } else track.audio.volume = level;
    }
    function target(track, value, ramp = .6) {
      track.target = clamp(value); track.ramp = ramp; track.audio.dataset.target = String(track.target);
    }
    function stop(track, rewind = true) {
      track.token++; track.pending = false; target(track, 0); track.level = 0;
      track.audio.muted = true; volume(track, 0, true); track.audio.pause();
      track.audio.onended = null; track.audio.onerror = null; track.audio.dataset.playing = 'false';
      if (rewind) { try { track.audio.currentTime = 0; } catch (_) {} }
    }
    function start(track, level, rewind = true) {
      if (!allowed()) return Promise.resolve(false);
      const token = ++track.token, session = epoch;
      track.epoch = session; track.pending = true; track.audio.muted = false;
      if (rewind) { try { track.audio.currentTime = 0; } catch (_) {} }
      graph(track); target(track, level, track.role === 'effect' ? .035 : track.role === 'voice' ? .08 : .6); volume(track, track.level, true);
      let result;
      try { result = track.audio.play(); } catch (e) { result = Promise.reject(e); }
      return Promise.resolve(result).then(() => {
        // A resolved old play() must never restart sound after mute or a chapter exit.
        if (token !== track.token) { if (!allowed() || track.target === 0) track.audio.pause(); return false; }
        track.pending = false;
        if (session !== epoch || !allowed()) { stop(track); return false; }
        track.audio.dataset.playing = 'true'; return true;
      }, () => {
        if (token !== track.token || session !== epoch) return false;
        stop(track); error = 'Tap to enable sound'; emit(); return false;
      });
    }
    function stopVoice() {
      if (voice) stop(voice.track);
      voice = null; voiceEnvelope = 1; emit();
    }
    function startAmbient(name) {
      if (!allowed()) return;
      if (ambient === name) return;
      ambient = name;
      // Cancel the outgoing intro immediately; only the beds crossfade.
      tracks.forEach(track => {
        if (track.role === 'intro') stop(track);
        else if (track.role === 'loop' && track.name !== name) target(track, 0, .65);
      });
      const loop = get(name, 'loop');
      const intro = get(name === 'archetypes-loop' ? 'archetypes-intro' : 'ambient-intro', 'intro');
      transition = {loop, intro, elapsed: 0, epoch, introLevel: .5};
      start(loop, 0, true);
      start(intro, .5, true).then(ok => {
        if (!ok && transition?.intro === intro && allowed()) target(loop, .5, .65);
      });
      intro.audio.onended = () => {
        if (transition?.intro !== intro || transition.epoch !== epoch || !allowed()) return;
        target(intro, 0); target(loop, .5, .65); transition = null;
      };
    }
    function treatment() {
      if (chapter !== 5 || !allowed()) return;
      const track = get('treatment');
      start(track, .3); track.audio.onended = () => { track.audio.dataset.playing = 'false'; target(track, 0); };
    }
    async function enable(index = chapter) {
      if (destroyed) return false;
      if (allowed() && !error) { setChapter(index); return true; }
      chapter = Math.max(0, Math.floor(Number(index) || 0));
      enabled = true; muted = false; suspended = false; error = null; const session = ++epoch;
      let resume = Promise.resolve();
      try {
        if (!context) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) context = new AudioContext();
          tracks.forEach(graph);
        }
        if (context?.state !== 'running') resume = Promise.resolve(context?.resume());
      } catch (_) { /* Media elements provide fallback when Web Audio is unavailable. */ }
      ambient = ''; startAmbient((chapter === 3 || chapter === 4) ? 'archetypes-loop' : 'ambient-loop'); treatment(); emit();
      try { await resume; } catch (_) { error = 'Tap to enable sound'; emit(); }
      return session === epoch && allowed();
    }
    function silence(background) {
      epoch++; muted = true; suspended = background; transition = null; ambient = ''; voice = null;
      tracks.forEach(track => stop(track));
      if (context?.state === 'running') Promise.resolve(context.suspend()).catch(() => {});
      emit();
    }
    function setChapter(index) {
      index = Math.max(0, Math.floor(Number(index) || 0));
      if (index === chapter || destroyed) return;
      chapter = index; stopVoice();
      tracks.forEach(track => { if (track.role === 'effect') stop(track); });
      startAmbient((chapter === 3 || chapter === 4) ? 'archetypes-loop' : 'ambient-loop'); treatment(); emit();
    }
    async function playVoice(kind, index) {
      stopVoice(); if (!allowed()) return false;
      if (kind === 'question' && chapter !== 1) return false;
      const count = kind === 'question' ? 6 : narration.length;
      index = ((Math.floor(Number(index) || 0) % count) + count) % count;
      const name = kind === 'question' ? 'question-' + String(index + 1).padStart(2, '0') : narration[index];
      const track = get(name, 'voice', kind === 'question' ? 'audio' : 'narration');
      const current = {kind, index, chapter, track}; voice = current; error = null;
      const pending = start(track, 1); emit();
      track.audio.onended = () => {
        if (voice !== current || !allowed() || current.chapter !== chapter) return;
        voice = null; stop(track); emit(); onVoiceEnd({kind, index, chapter});
      };
      track.audio.onerror = () => {
        if (voice !== current) return;
        stop(track); voice = null; error = 'Audio unavailable · retry'; emit();
      };
      const ok = await pending;
      if (voice !== current) return false;
      if (!ok) voice = null;
      emit(); return ok;
    }
    function cue(name, level = .4) {
      if (!allowed() || !['menu', 'woosh-1', 'woosh-2', 'woosh-3'].includes(name)) return;
      // Rapid chapter/nav clicks replace an effect instead of stacking whooshes.
      tracks.forEach(track => { if (track.role === 'effect' && track.name !== 'treatment') stop(track); });
      const track = get(name); start(track, clamp(level));
      track.audio.onended = () => { track.audio.dataset.playing = 'false'; target(track, 0); };
    }
    function tick(dt, profileEnvelope = 1, twinProgress = 0) {
      if (!allowed()) return;
      dt = clamp(dt, 0, .1); const smoothing = 1 - Math.exp(-dt * 8);
      voiceEnvelope += (clamp(profileEnvelope) - voiceEnvelope) * smoothing;
      twinEnvelope += (clamp(twinProgress) - twinEnvelope) * smoothing;
      if (transition && transition.epoch === epoch) {
        transition.elapsed += dt;
        if (transition.elapsed >= 5) {
          // The reference holds the introduction for five seconds, then blends for five.
          const blend = clamp((transition.elapsed - 5) / 5);
          target(transition.intro, .5 * (1 - blend), .08);
          target(transition.loop, .5 * blend, .08);
          if (blend === 1) { stop(transition.intro); transition = null; }
        }
      }
      tracks.forEach(track => {
        const isVoice = voice?.track === track;
        const duck = voice && (track.role === 'loop' || track.role === 'intro' || track.name === 'treatment') ? .25 : 1;
        const envelope = isVoice && voice.kind === 'question' ? .25 + .75 * voiceEnvelope : 1;
        const desired = track.target * duck * envelope;
        track.level += (desired - track.level) * (1 - Math.exp(-dt / (isVoice ? .08 : track.ramp)));
        volume(track, track.level);
        if (track.filter && context) {
          const cutoff = isVoice ? 800 + voiceEnvelope * 9200 : track.name === 'archetypes-loop' ? 10000 - twinEnvelope * 9200 : 10000;
          track.filter.frequency.setTargetAtTime(cutoff, context.currentTime, .08);
        }
        // A zero-gain pending bed must stay alive while its intro is playing.
        const waitingBed = transition?.loop === track;
        if (!waitingBed && !track.pending && track.target === 0 && track.level < .001 && !track.audio.paused) stop(track);
      });
      if (voice && !voice.track.audio.paused) {
        const audio = voice.track.audio, duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        onVoiceProgress({kind: voice.kind, index: voice.index, currentTime: audio.currentTime,
          duration, progress: duration > 0 ? clamp(audio.currentTime / duration) : 0});
      }
    }
    const onVisibility = () => { if (document.hidden) silence(true); };
    const onPageHide = () => silence(true);
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('pagehide', onPageHide);
    return {enable, setChapter, playQuestion: index => playVoice('question', index),
      playNarration: index => playVoice('narration', index), stopVoice, cue, tick,
      mute: () => silence(false), suspend: () => silence(true), getState: state,
      destroy() {
        silence(true); destroyed = true;
        document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide);
        tracks.forEach(track => { track.source?.disconnect(); track.filter?.disconnect(); track.gain?.disconnect(); track.audio.remove(); });
        tracks.clear(); if (context) Promise.resolve(context.close()).catch(() => {});
      }};
  }
  window.JourneyAudio = {create};
})();
