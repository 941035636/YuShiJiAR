"use strict";
var sources=require("./effects-config.js").audio;
function AudioController(onState){
  this.onState=onState;this.enabled=true;this.tracked=false;this.ended=false;this.contexts={};this.playing={};this.failed={};
  var self=this;
  try{["ambient","narration"].forEach(function(name){
    var context=wx.createInnerAudioContext();self.contexts[name]=context;
    context.autoplay=false;context.loop=name==="ambient";context.volume=name==="ambient"?0.3:0.6;
    context.onPlay(function(){
      if(self.disposed)return;
      if(!self.enabled||!self.tracked){self.pause(name);return;}
      self.onState("声音播放中");
    });
    context.onEnded(function(){if(self.disposed)return;self.playing[name]=false;if(name==="narration"){self.ended=true;self.onState("讲解已结束，可点击重新播放");}});
    context.onError(function(error){if(self.disposed)return;self.playing[name]=false;self.failed[name]=true;self.onState((name==="ambient"?"环境音":"讲解")+"播放失败："+(error.errMsg||error.errCode||"请尝试重新开启声音"));});
    context.src=sources[name];
  });this.onState("声音已开启，识别后播放");}
  catch(error){this.dispose();this.onState("音频初始化失败："+error.message);}
}
AudioController.prototype.pause=function(name){
  var context=this.contexts[name];if(context){try{context.pause();}catch(_){}this.playing[name]=false;}
};
AudioController.prototype.sync=function(){
  var self=this;if(this.disposed)return;
  ["ambient","narration"].forEach(function(name){
    if(!self.enabled||!self.tracked){self.pause(name);return;}
    if(self.playing[name]||self.failed[name]||(name==="narration"&&self.ended))return;
    try{self.playing[name]=true;self.contexts[name].play();}catch(error){self.playing[name]=false;self.failed[name]=true;self.onState("播放失败："+error.message);}
  });
};
AudioController.prototype.setTracked=function(value){
  if(this.disposed)return;
  if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null;
  value=!!value;
  if(value){var self=this;this.watchdog=setTimeout(function(){self.watchdog=null;self.setTracked(false);},500);}
  if(this.tracked===value)return;this.tracked=value;this.sync();
  if(!value&&!this.disposed)this.onState(this.enabled?"识别中断，声音已暂停":"声音已关闭");
};
AudioController.prototype.setEnabled=function(value){
  this.enabled=!!value;if(this.enabled)this.failed={};this.sync();
  if(!this.disposed)this.onState(this.enabled?(this.tracked?"正在恢复声音":"声音已开启，识别后播放"):"声音已关闭");
};
AudioController.prototype.replay=function(){
  if(this.disposed)return;this.ended=false;this.failed.narration=false;
  try{this.contexts.narration.stop();}catch(_){}this.playing.narration=false;this.sync();
  this.onState(this.enabled&&this.tracked?"正在重新播放讲解":"识别后重新播放讲解");
};
AudioController.prototype.reset=function(){
  if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null;
  this.tracked=false;this.ended=false;this.failed={};this.playing={};
  var self=this;Object.keys(this.contexts).forEach(function(name){try{self.contexts[name].stop();}catch(_){}});
  if(!this.disposed)this.onState(this.enabled?"声音已开启，识别后播放":"声音已关闭");
};
AudioController.prototype.dispose=function(){
  if(this.watchdog)clearTimeout(this.watchdog);this.watchdog=null;
  this.disposed=true;this.tracked=false;
  var self=this;Object.keys(this.contexts).forEach(function(name){try{self.contexts[name].stop();}catch(_){}try{self.contexts[name].destroy();}catch(_){}});this.contexts={};
};
module.exports={AudioController:AudioController};
