const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const source = fs.readFileSync(__dirname + '/../journey-audio.js', 'utf8');
function setup(webAudio = true) {
  const elements = [], callbacks = {}, states = [], progress = [], ended = [];
  let deferred = false;
  class Audio {
    constructor(url) { this.src = url; this.dataset = {}; this.paused = true; this.currentTime = 0; this.duration = 10; this.volume = 1; this.muted = false; this.calls = []; }
    play() {
      this.paused = false;
      if (!deferred) return Promise.resolve();
      return new Promise((resolve, reject) => this.calls.push({resolve: () => { this.paused = false; resolve(); }, reject}));
    }
    pause() { this.paused = true; }
    remove() { this.removed = true; }
  }
  const param = () => ({value: 0, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }});
  const node = () => ({connect() {}, disconnect() {}});
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = node(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createMediaElementSource() { return node(); }
    createBiquadFilter() { return {...node(), frequency: param()}; }
    createGain() { return {...node(), gain: param()}; }
  }
  const document = {hidden: false, body: {append: x => elements.push(x)}, addEventListener: (n, f) => callbacks[n] = f, removeEventListener: n => delete callbacks[n]};
  const window = {AudioContext: webAudio ? AudioContext : undefined, addEventListener: (n, f) => callbacks[n] = f, removeEventListener: n => delete callbacks[n]};
  vm.runInNewContext(source, {window, document, Audio, Promise, Math, Number, String, Map});
  const audio = window.JourneyAudio.create({onState: s => states.push(s), onVoiceProgress: x => progress.push(x), onVoiceEnd: x => ended.push(x)});
  const track = name => elements.find(x => x.dataset.track === name);
  const tick = seconds => { for(let i = 0; i < seconds * 60; i++) audio.tick(1 / 60); };
  return {audio, elements, document, callbacks, states, progress, ended, track, tick, defer: () => deferred = true};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('late play promises cannot revive sound after mute', async () => {
  const x = setup(); x.defer(); await x.audio.enable(1);
  const pending = x.audio.playQuestion(0); x.tick(.5); x.audio.mute();
  x.elements.forEach(t => t.calls.forEach(p => p.resolve())); await pending; await flush();
  assert.ok(x.elements.every(t => t.paused && t.muted)); assert.equal(x.audio.getState().voice, null);
});
test('rapid chapter changes cancel narration, treatment and intro overlap', async () => {
  const x = setup(); await x.audio.enable(1); await x.audio.playQuestion(0); x.tick(1);
  const staleEnd = x.track('question-01').onended;
  x.audio.setChapter(3); assert.equal(x.track('question-01').paused, true);
  assert.equal(x.track('ambient-intro').paused, true); staleEnd(); assert.equal(x.ended.length, 0);
  x.audio.setChapter(5); assert.equal(x.track('archetypes-intro').paused, true);
  assert.equal(x.track('treatment').paused, false); x.audio.setChapter(6); assert.equal(x.track('treatment').paused, true);
  assert.ok(x.elements.filter(t => t.dataset.role === 'intro' && !t.paused).length <= 1);
});
test('old question completion cannot stop a newer question; progress follows current narration', async () => {
  const x = setup(); await x.audio.enable(1); x.defer();
  const first = x.audio.playQuestion(0), second = x.audio.playQuestion(1);
  x.track('question-01').calls[0].resolve(); await first;
  x.track('question-02').calls[0].resolve(); assert.equal(await second, true);
  assert.equal(x.track('question-01').paused, true);
  x.track('question-02').currentTime = 4; x.audio.tick(.05);
  assert.equal(x.progress.at(-1).index, 1); assert.equal(x.progress.at(-1).progress, .4);
  x.track('question-02').onended(); assert.equal(x.ended.length, 1); assert.equal(x.ended[0].index, 1);
});
test('intro hands off to loop; voice ducks and releases loop smoothly', async () => {
  const x = setup(false); await x.audio.enable(1); await flush(); x.tick(10);
  const loop = x.track('ambient-loop'); assert.ok(loop.volume > .45); assert.equal(x.track('ambient-intro').paused, true);
  await x.audio.playQuestion(0); x.tick(3); assert.ok(loop.volume < .14);
  x.audio.stopVoice(); const before = loop.volume; x.audio.tick(1 / 60); assert.ok(loop.volume > before && loop.volume < .2);
  x.tick(3); assert.ok(loop.volume > .45);
});
test('hidden page is silent until explicitly enabled again', async () => {
  const x = setup(); await x.audio.enable(1); await x.audio.playQuestion(0);
  x.document.hidden = true; x.callbacks.visibilitychange(); x.document.hidden = false; x.callbacks.visibilitychange();
  assert.equal(x.audio.getState().suspended, true); assert.ok(x.elements.every(t => t.paused));
  assert.equal(await x.audio.playQuestion(1), false);
  await x.audio.enable(1); assert.equal(x.audio.getState().suspended, false);
});
test('same-track rapid replay preserves newest play; destroy removes nodes and listeners', async () => {
  const x = setup(); await x.audio.enable(1); x.defer();
  const first = x.audio.playQuestion(0), second = x.audio.playQuestion(0), track = x.track('question-01');
  track.calls[1].resolve(); assert.equal(await second, true); track.calls[0].resolve(); assert.equal(await first, false);
  assert.equal(track.paused, false); x.audio.destroy(); assert.ok(x.elements.every(t => t.paused && t.removed));
  assert.equal(x.callbacks.visibilitychange, undefined);
});

test('stale rejection does not replace new voice state with an error', async () => {
  const x = setup(); await x.audio.enable(1); x.defer();
  const first = x.audio.playQuestion(0), second = x.audio.playQuestion(1);
  x.track('question-02').calls[0].resolve(); await second;
  x.track('question-01').calls[0].reject(new Error('old rejection')); await first;
  assert.equal(x.audio.getState().error, null); assert.equal(x.audio.getState().voice.index, 1);
});
test('failed ambient playback allows an explicit gesture retry', async () => {
  const x = setup(); x.defer(); await x.audio.enable(0);
  x.track('ambient-intro').calls[0].reject(new Error('autoplay blocked')); await flush();
  assert.equal(x.audio.getState().error, 'Tap to enable sound');
  await x.audio.enable(0); assert.equal(x.track('ambient-intro').calls.length, 2);
  x.track('ambient-intro').calls[1].resolve(); await flush();
  assert.equal(x.audio.getState().error, null);
});
