"use strict";

var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";

var model={
  defaultVariant:"reference",
  variants:{
    reference:{label:"常胜原版金币素材",url:base+"Model/GoldModel/qikaidesheng_jinbi.glb",sizeMB:7.3},
    jade:{label:"常胜墨玉素材",url:base+"Model/MoyuModel/qikaidesheng_moyu.glb",sizeMB:8.6}
  },
  url:base+"Model/GoldModel/qikaidesheng_jinbi.glb",
  maxBytes:20*1024*1024,
  height:0.42,
  centerX:0,
  centerY:0.03,
  fov:50,
  lighting:{exposure:1,ambient:2,key:3,effectExposure:1}
};

var effects={
  effects:[
    {key:"qkds01",label:"常胜法阵",url:base+"FrameAnimation/qkds01.glb",scale:[0.5,0.5,0.5],position:[0,-0.5,0.5],exposure:1.2},
    {key:"scene",label:"常胜背景",url:base+"FrameAnimation/scene.glb",scale:[0.7,0.7,0.7],position:[0,-1,-0.5],exposure:1.1},
    {key:"qkdshr",label:"常胜环绕",url:base+"FrameAnimation/qkdshr.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.5],exposure:1.2}
  ],
  profileLabel:"法阵 120% / 背景 110% / 环绕 120%",
  readyText:"常胜法阵、背景、环绕特效已就绪",
  audio:{
    ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),
    narration:base+"Audio/"+encodeURIComponent("旗开得胜.mp3")
  }
};

module.exports={
  key:"chang-sheng",
  name:"常胜",
  nativeReady:true,
  target:require("../targets/chang-sheng.js"),
  model:model,
  effects:effects,
  audio:{sources:effects.audio,volumes:{ambient:0.3,narration:0.6}},
  visual:{storageKey:"ysj-native-visual-chang-sheng-v1"},
  ui:{
    navigationTitle:"常胜 AR 体验",
    title:"常胜 · 遇石记 AR",
    recognitionName:"常胜识别图",
    loadingText:"正在加载常胜场景，请稍候",
    visibleText:"常胜已现身",
    promptText:"请将摄像头对准常胜识别图"
  }
};
