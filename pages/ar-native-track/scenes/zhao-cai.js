"use strict";

var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";

var model={
  defaultVariant:"reference",
  variants:{
    reference:{label:"招财原版金币素材",url:base+"Model/GoldModel/dcdy_jinbi.glb",sizeMB:9.2},
    jade:{label:"招财墨玉素材",url:base+"Model/MoyuModel/dcdy_moyu.glb",sizeMB:9.3}
  },
  url:base+"Model/GoldModel/dcdy_jinbi.glb",
  maxBytes:20*1024*1024,
  height:0.42,
  centerX:0,
  centerY:0.03,
  fov:50,
  lighting:{exposure:1,ambient:3,key:2,effectExposure:1}
};

var effects={
  effects:[
    {key:"dcdy02-1",label:"招财法阵",url:base+"FrameAnimation/"+encodeURIComponent("dcdy02 (1).glb"),scale:[0.5,0.5,0.5],position:[0,-0.5,0.5],exposure:1.3},
    {key:"long-1",label:"招财龙图腾",url:base+"FrameAnimation/"+encodeURIComponent("long(1).glb"),scale:[0.5,0.5,0.5],position:[0,-1,-0.5],exposure:1.1},
    {key:"dcdyhr",label:"招财环绕",url:base+"FrameAnimation/dcdyhr.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.5],exposure:1.2}
  ],
  profileLabel:"法阵 130% / 龙图腾 110% / 环绕 120%",
  readyText:"招财法阵、龙图腾、环绕特效已就绪",
  audio:{
    ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),
    narration:base+"Audio/"+encodeURIComponent("多财多亿.mp3")
  }
};

module.exports={
  key:"zhao-cai",
  name:"招财",
  nativeReady:true,
  target:require("../targets/zhao-cai.js"),
  model:model,
  effects:effects,
  audio:{sources:effects.audio,volumes:{ambient:0.3,narration:0.6}},
  visual:{storageKey:"ysj-native-visual-zhao-cai-v1"},
  ui:{
    navigationTitle:"招财 AR 体验",
    title:"招财 · 遇石记 AR",
    recognitionName:"招财识别图",
    loadingText:"正在加载招财场景，请稍候",
    visibleText:"招财已现身",
    promptText:"请将摄像头对准招财识别图"
  }
};
