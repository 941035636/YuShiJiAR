// A virtual clock checks delayed scene sound without waiting three real seconds.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let now=10000,nextId=0;
const timers=new Map(),contexts=[],states=[];
function schedule(fn,delay){const id=++nextId;timers.set(id,{fn,at:now+delay});return id;}
function advance(ms,heartbeat){
  const end=now+ms;
  while(now<end){
    now=Math.min(end,now+100);
    if(heartbeat)audio.setTracked(true);
    let due;
    while((due=[...timers].filter(([,t])=>t.at<=now).sort((a,b)=>a[1].at-b[1].at)[0])){
      timers.delete(due[0]);due[1].fn();
    }
  }
}
const context=vm.createContext({module:{exports:{}},require:require('node:module').createRequire(path.resolve('pages/ar-native-track/audio.js')),
  Date:{now:()=>now},setTimeout:schedule,clearTimeout:id=>timers.delete(id),
  wx:{createInnerAudioContext(){const value={plays:0,pauses:0,stops:0,destroys:0,handlers:{},
    play(){this.plays++;},pause(){this.pauses++;},stop(){this.stops++;},destroy(){this.destroys++;},
    onPlay(fn){this.handlers.play=fn;},onEnded(fn){this.handlers.ended=fn;},onError(fn){this.handlers.error=fn;}};contexts.push(value);return value;}}
});
vm.runInContext(fs.readFileSync('pages/ar-native-track/audio.js','utf8'),context);
const scene=require('../pages/ar-native-track/scenes/jin-xi.js');
const audio=new context.module.exports.AudioController(text=>states.push(text),scene.audio);
const [ambient,narration,phoenix]=contexts;
assert.equal(contexts.length,3);assert.equal(phoenix.src,scene.audio.cues[0].src);
assert.equal(phoenix.loop,false);assert.equal(phoenix.volume,.3);
advance(4000);assert.equal(phoenix.plays,0,'no target means no delayed sound');
audio.setTracked(true);assert.equal(ambient.plays,1);assert.equal(narration.plays,1);
advance(1000,true);const stale=[...timers.values()].map(t=>t.fn);audio.setTracked(false);
advance(5000);assert.equal(phoenix.plays,0,'loss cancels the delayed cue');
audio.setTracked(true);for(const fn of stale)fn();assert.equal(phoenix.plays,0,'cancelled timer must not fire in the next tracking session');
advance(1000,true);audio.setEnabled(false);
advance(5000,true);assert.equal(phoenix.plays,0,'muting freezes remaining cue delay');
audio.setEnabled(true);advance(900,true);assert.equal(phoenix.plays,0);
advance(100,true);assert.equal(phoenix.plays,1,'cue starts after three seconds of active tracked sound');
audio.setTracked(false);const paused=phoenix.pauses;phoenix.handlers.play();assert(phoenix.pauses>paused,'late play after loss pauses immediately');
audio.setTracked(true);assert.equal(phoenix.plays,2,'unfinished cue resumes');
phoenix.handlers.ended();audio.setTracked(false);audio.setTracked(true);advance(4000,true);
assert.equal(phoenix.plays,2,'completed cue must not replay on reacquisition');
const narratorPlays=narration.plays;audio.replay();assert.equal(narration.plays,narratorPlays+1);assert.equal(phoenix.plays,2,'replay button only restarts narration');

audio.reset();audio.setTracked(true);advance(3000,true);assert.equal(phoenix.plays,3,'new experience resets the cue');
phoenix.handlers.error({errMsg:'network failed'});assert.match(states.at(-1),/凤凰音效播放失败/);
audio.setTracked(false);audio.setTracked(true);assert.equal(phoenix.plays,3,'failed cue must not retry per frame');
audio.setEnabled(false);audio.setEnabled(true);assert.equal(phoenix.plays,4,'explicit enable retries cue');
advance(600);assert.equal(audio.tracked,false,'stale camera stream pauses all audio');

audio.reset();audio.setTracked(true);advance(200,true);
const pending=[...timers.values()].map(t=>t.fn);
audio.dispose();advance(5000);
const plays=phoenix.plays,stateCount=states.length;
for(const fn of [...stale,...pending])fn();phoenix.handlers.play();phoenix.handlers.ended();phoenix.handlers.error({errMsg:'late'});
assert.equal(phoenix.plays,plays);assert.equal(states.length,stateCount);
assert.equal(timers.size,0);assert(contexts.every(c=>c.destroys===1));
console.log('Delayed Phoenix cue: active time, pause/resume, mute, one-shot, reset/retry, stale stream and disposal passed.');
