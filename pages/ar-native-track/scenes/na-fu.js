"use strict";

var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";
var model={
  defaultVariant:"reference",
  variants:{
    reference:{label:"纳福原版金币素材",url:base+"Model/GoldModel/SYJD.glb",sizeMB:10.3},
    jade:{label:"纳福墨玉素材",url:base+"Model/MoyuModel/SYJD_moyu.glb",sizeMB:10.2}
  },
  url:base+"Model/GoldModel/SYJD.glb",
  maxBytes:20*1024*1024,
  maxSkinVertices:12000,
  height:0.42,centerX:0,centerY:0.03,fov:50,
  lighting:{exposure:1,ambient:2,key:3,effectExposure:1}
};
var effects={
  effects:[
    {key:"long",label:"纳福祥龙",url:base+"Model/otherModel/long.glb",scale:[3,3,3],position:[0,-1,5],exposure:1.1},
    {key:"syjd",label:"纳福法阵",url:base+"FrameAnimation/syjd.glb",scale:[0.5,0.5,0.5],position:[0,-0.5,0.5],exposure:1.2},
    {key:"syjdhr",label:"纳福环绕",url:base+"FrameAnimation/syjdhr.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.5],exposure:1.2},
    {key:"syjd-text",label:"纳福文字",url:base+"Model/otherModel/syjd.glb",scale:[0.1,0.1,0.1],position:[0,-0.5,-0.3],exposure:1}
  ],
  profileLabel:"祥龙 110% / 法阵与环绕 120% / 文字 100%",
  readyText:"纳福祥龙、法阵、环绕、文字特效已就绪",
  audio:{ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),narration:base+"Audio/"+encodeURIComponent("所愿皆得.mp3")}
};
module.exports={
  key:"na-fu",name:"纳福",nativeReady:true,
  target:require("../targets/na-fu.js"),
  // The sparse white background benefits from a fresh ORB keyframe during motion.
  tracking:{reverifyMs:1500},
  model:model,effects:effects,
  audio:{sources:effects.audio,volumes:{ambient:0.3,narration:0.6},loops:{ambient:false},cues:[
    {key:"dragon",label:"龙音效",src:base+"Audio/"+encodeURIComponent("龙的音效.MP3"),delayMs:3000,volume:0.4}
  ]},
  visual:{storageKey:"ysj-native-visual-na-fu-v1"},
  ui:{navigationTitle:"纳福 AR 体验",title:"纳福 · 遇石记 AR",recognitionName:"纳福识别图",
    loadingText:"正在加载纳福场景，请稍候",visibleText:"纳福已现身",promptText:"请将摄像头对准纳福识别图"}
};
