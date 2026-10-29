"use strict";

var model=require("../model-config.js");
var effects=require("../effects-config.js");

module.exports={
  key:"ben-zun",
  name:"本尊",
  nativeReady:true,
  target:require("../target.js"),
  model:model,
  effects:effects,
  audio:{
    sources:effects.audio,
    volumes:{ambient:0.3,narration:0.6}
  },
  visual:{storageKey:"ysj-native-visual-v1"},
  ui:{
    navigationTitle:"本尊 AR 体验",
    title:"本尊 · 遇石记 AR",
    recognitionName:"本尊识别图",
    loadingText:"正在加载本尊，请稍候",
    visibleText:"本尊已现身",
    promptText:"请将摄像头对准本尊识别图"
  }
};
