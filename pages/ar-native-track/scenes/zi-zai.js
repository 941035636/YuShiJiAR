"use strict";

var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";

var model={
  defaultVariant:"reference",
  variants:{
    reference:{label:"自在原版金币素材",url:base+"Model/GoldModel/wszz.glb",sizeMB:7.9},
    jade:{label:"自在墨玉素材",url:base+"Model/wszz_yu.glb",sizeMB:9.8}
  },
  url:base+"Model/GoldModel/wszz.glb",
  maxBytes:20*1024*1024,
  height:0.42,
  centerX:0,
  centerY:0.03,
  fov:50,
  lighting:{exposure:1,ambient:3,key:3,effectExposure:1}
};

var effects={
  effects:[
    {key:"dcdy02-2",label:"自在法阵",url:base+"FrameAnimation/"+encodeURIComponent("dcdy02 (2).glb"),scale:[0.5,0.5,0.5],position:[0,-0.5,0.5],exposure:1.3},
    {key:"gui",label:"自在龟图腾",url:base+"FrameAnimation/gui.glb",scale:[0.5,0.5,0.5],position:[0,-1,-0.5],exposure:1.1},
    {key:"wszzhr",label:"自在环绕",url:base+"FrameAnimation/wszzhr.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.4],exposure:1.2}
  ],
  profileLabel:"法阵 130% / 龟图腾 110% / 环绕 120%",
  readyText:"自在法阵、龟图腾、环绕特效已就绪",
  audio:{
    ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),
    narration:base+"Audio/"+encodeURIComponent("无事自在.mp3")
  }
};

module.exports={
  key:"zi-zai",
  name:"自在",
  nativeReady:true,
  target:require("../targets/zi-zai.js"),
  // This card's sparse features need a newer ORB keyframe during sustained motion.
  tracking:{reverifyMs:1500},
  model:model,
  effects:effects,
  audio:{sources:effects.audio,volumes:{ambient:0.3,narration:0.6}},
  visual:{storageKey:"ysj-native-visual-zi-zai-v1"},
  ui:{
    navigationTitle:"自在 AR 体验",
    title:"自在 · 遇石记 AR",
    recognitionName:"自在识别图",
    loadingText:"正在加载自在场景，请稍候",
    visibleText:"自在已现身",
    promptText:"请将摄像头对准自在识别图"
  }
};
