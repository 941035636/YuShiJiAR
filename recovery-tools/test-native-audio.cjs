const assert=require('node:assert/strict');
const {AudioController}=require('../pages/ar-native-track/audio.js');
const sources=require('../pages/ar-native-track/effects-config.js').audio;
const contexts=[],states=[];
global.wx={createInnerAudioContext(){
  const context={plays:0,pauses:0,stops:0,destroys:0,handlers:{},
    play(){this.plays++;},pause(){this.pauses++;},stop(){this.stops++;},destroy(){this.destroys++;},
    onPlay(fn){this.handlers.play=fn;},onEnded(fn){this.handlers.ended=fn;},onError(fn){this.handlers.error=fn;}};
  contexts.push(context);return context;
}};
async function main(){
  const audio=new AudioController(text=>states.push(text)),[ambient,narration]=contexts;
  assert.equal(ambient.src,sources.ambient);assert.equal(narration.src,sources.narration);
  assert.equal(ambient.loop,true);assert.equal(narration.loop,false);assert.equal(narration.plays,0);
  audio.setTracked(true);assert.equal(ambient.plays,1);assert.equal(narration.plays,1);
  audio.setTracked(true);assert.equal(narration.plays,1,'do not replay on every frame');
  audio.setTracked(false);assert(ambient.pauses&&narration.pauses);
  const before=narration.pauses;narration.handlers.play();assert(narration.pauses>before,'late play must be paused after loss');
  audio.setTracked(true);assert.equal(narration.plays,2,'reacquisition resumes');
  narration.handlers.ended();audio.setTracked(false);audio.setTracked(true);
  assert.equal(narration.plays,2,'completed narration must not replay automatically');
  audio.replay();assert.equal(narration.plays,3);
  narration.handlers.error({errMsg:'network failed'});const plays=narration.plays;
  audio.setTracked(false);audio.setTracked(true);assert.equal(narration.plays,plays,'failure must not retry every frame');
  audio.setEnabled(false);audio.setEnabled(true);assert.equal(narration.plays,plays+1,'explicit retry');
  await new Promise(resolve=>setTimeout(resolve,550));assert.equal(audio.tracked,false,'stale camera stream must pause sound');
  audio.setTracked(true);audio.reset();assert.equal(audio.tracked,false);assert(ambient.stops&&narration.stops);
  audio.dispose();assert.equal(ambient.destroys,1);assert.equal(narration.destroys,1);
  const count=states.length;narration.handlers.error({errMsg:'late error'});narration.handlers.play();assert.equal(states.length,count);
  console.log('Audio target gating, pause/resume, ended narration, explicit retry, stale frames, reset and disposal passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
