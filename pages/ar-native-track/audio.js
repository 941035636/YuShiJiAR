"use strict";
var defaultSources=require("./effects-config.js").audio;
function AudioController(onState,options){
  options=options||{};
  var sources=options.sources||options.audio||defaultSources,volumes=options.volumes||{};
  this.onState=onState;this.enabled=true;this.tracked=false;this.ended=false;this.contexts={};this.playing={};this.failed={};this.lastTrackedAt=0;
  this.cues={};this.cueTimers={};this.cueEnded={};this.cueElapsedMs=0;this.cueAt=null;
  var self=this;
  var sourceMap={ambient:sources.ambient,narration:sources.narration};
  (options.cues||[]).forEach(function(cue,i){
    var name="cue:"+i;sourceMap[name]=cue.src;self.cues[name]={label:cue.label||"场景音效",delayMs:Math.max(0,Math.min(60000,Number(cue.delayMs)||0)),volume:cue.volume===undefined?0.3:cue.volume};
  });
  try{Object.keys(sourceMap).filter(function(name){return !!sourceMap[name];}).forEach(function(name){
    var context=wx.createInnerAudioContext();self.contexts[name]=context;
    context.autoplay=false;context.loop=name==="ambient";context.volume=self.cues[name]?self.cues[name].volume:volumes[name]!==undefined?volumes[name]:name==="ambient"?0.3:0.6;
    context.onPlay(function(){
      if(self.disposed)return;
      if(!self.enabled||!self.tracked){self.pause(name);return;}
      self.onState("声音播放中");
    });
    context.onEnded(function(){if(self.disposed)return;self.playing[name]=false;if(self.cues[name])self.cueEnded[name]=true;if(name==="narration"){self.ended=true;self.onState("讲解已结束，可点击重新播放");}});
    context.onError(function(error){if(self.disposed)return;self.playing[name]=false;self.failed[name]=true;self.onState((self.cues[name]?self.cues[name].label:name==="ambient"?"环境音":"讲解")+"播放失败："+(error.errMsg||error.errCode||"请尝试重新开启声音"));});
    context.src=sourceMap[name];
  });this.onState("声音已开启，识别后播放");}
  catch(error){this.dispose();this.onState("音频初始化失败："+error.message);}
}
AudioController.prototype.pause=function(name){
  var context=this.contexts[name];if(context){try{context.pause();}catch(_){}this.playing[name]=false;}
};
AudioController.prototype.clearCueTimer=function(name){
  if(this.cueTimers[name]!==undefined)clearTimeout(this.cueTimers[name]);delete this.cueTimers[name];
};
AudioController.prototype.sync=function(){
  var self=this;if(this.disposed)return;
  var now=Date.now();if(this.cueAt!==null)this.cueElapsedMs+=Math.max(0,now-this.cueAt);
  this.cueAt=this.enabled&&this.tracked?now:null;
  Object.keys(this.contexts).forEach(function(name){
    self.clearCueTimer(name);
    if(!self.enabled||!self.tracked){self.pause(name);return;}
    if(self.playing[name]||self.failed[name]||self.cueEnded[name]||(name==="narration"&&self.ended))return;
    var cue=self.cues[name],remaining=cue?cue.delayMs-self.cueElapsedMs:0;
    if(remaining>0){
      var timer=setTimeout(function(){
        if(self.disposed||self.cueTimers[name]!==timer)return;
        delete self.cueTimers[name];self.sync();
      },remaining);self.cueTimers[name]=timer;return;
    }
    try{self.playing[name]=true;self.contexts[name].play();}catch(error){self.playing[name]=false;self.failed[name]=true;self.onState("播放失败："+error.message);}
  });
};
AudioController.prototype.setTracked=function(value){
  if(this.disposed)return;
  value=!!value;
  if(value){
    this.lastTrackedAt=Date.now();
    if(!this.watchdog){var self=this;this.watchdog=setTimeout(function check(){
      if(self.disposed){self.watchdog=null;return;}
      var remaining=500-(Date.now()-self.lastTrackedAt);
      if(remaining>0){self.watchdog=setTimeout(check,remaining);return;}
      self.watchdog=null;self.setTracked(false);
    },500);}
  }else{
    this.lastTrackedAt=0;if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null;
  }
  if(this.tracked===value)return;this.tracked=value;this.sync();
  if(!value&&!this.disposed)this.onState(this.enabled?"识别中断，声音已暂停":"声音已关闭");
};
AudioController.prototype.setEnabled=function(value){
  this.enabled=!!value;if(this.enabled)this.failed={};this.sync();
  if(!this.disposed)this.onState(this.enabled?(this.tracked?"正在恢复声音":"声音已开启，识别后播放"):"声音已关闭");
};
AudioController.prototype.replay=function(){
  if(this.disposed)return;this.ended=false;this.failed.narration=false;
  if(this.contexts.narration)try{this.contexts.narration.stop();}catch(_){}this.playing.narration=false;this.sync();
  this.onState(this.enabled&&this.tracked?"正在重新播放讲解":"识别后重新播放讲解");
};
AudioController.prototype.reset=function(){
  if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null;
  this.lastTrackedAt=0;this.tracked=false;this.ended=false;this.failed={};this.playing={};
  this.cueElapsedMs=0;this.cueAt=null;this.cueEnded={};
  Object.keys(this.cueTimers).forEach(this.clearCueTimer.bind(this));
  var self=this;Object.keys(this.contexts).forEach(function(name){try{self.contexts[name].stop();}catch(_){}});
  if(!this.disposed)this.onState(this.enabled?"声音已开启，识别后播放":"声音已关闭");
};
AudioController.prototype.dispose=function(){
  if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null;
  this.disposed=true;this.tracked=false;
  Object.keys(this.cueTimers).forEach(this.clearCueTimer.bind(this));this.cueAt=null;
  var self=this;Object.keys(this.contexts).forEach(function(name){try{self.contexts[name].stop();}catch(_){}try{self.contexts[name].destroy();}catch(_){}});this.contexts={};
};
module.exports={AudioController:AudioController};
