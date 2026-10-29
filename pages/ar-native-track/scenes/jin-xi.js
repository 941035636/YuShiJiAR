"use strict";

var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";
var model={
  defaultVariant:"reference",
  variants:{
    reference:{label:"进喜原版金币素材",url:base+"Model/GoldModel/xicongtianjiang.glb",sizeMB:4.9},
    jade:{label:"进喜墨玉素材",url:base+"Model/MoyuModel/xicongtianjiang_moyu.glb",sizeMB:5.0}
  },
  url:base+"Model/GoldModel/xicongtianjiang.glb",
  maxBytes:20*1024*1024,
  height:0.42,centerX:0,centerY:0.03,fov:50,
  lighting:{exposure:1,ambient:2,key:3,effectExposure:1}
};
var effects={
  effects:[
    {key:"xctj",label:"进喜法阵",url:base+"FrameAnimation/xctj.glb",scale:[0.5,0.5,0.5],position:[0,-0.5,0.5],exposure:1.2},
    {key:"zhuque",label:"进喜朱雀",url:base+"Model/otherModel/zhuque.glb",scale:[1,1,1],position:[0,-0.5,1],exposure:1.1},
    {key:"xctj-z",label:"进喜文字",url:base+"Model/otherModel/"+encodeURIComponent("xctj_z(3).glb"),scale:[8,8,8],position:[0,-0.5,0.5],exposure:1.2},
    {key:"xctjhr",label:"进喜环绕",url:base+"FrameAnimation/xctjhr.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.5],exposure:1.2}
  ],
  profileLabel:"法阵 120% / 朱雀 110% / 文字与环绕 120%",
  readyText:"进喜法阵、朱雀、文字、环绕特效已就绪",
  audio:{ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),narration:base+"Audio/"+encodeURIComponent("喜从天降.mp3")}
};
module.exports={
  key:"jin-xi",name:"进喜",nativeReady:true,
  target:require("../targets/jin-xi.js"),
  model:model,effects:effects,
  audio:{sources:effects.audio,volumes:{ambient:0.3,narration:0.6},cues:[
    {key:"phoenix",label:"凤凰音效",src:base+"Audio/"+encodeURIComponent("凤凰.mp3"),delayMs:3000,volume:0.3}
  ]},
  visual:{storageKey:"ysj-native-visual-jin-xi-v1"},
  ui:{navigationTitle:"进喜 AR 体验",title:"进喜 · 遇石记 AR",recognitionName:"进喜识别图",
    loadingText:"正在加载进喜场景，请稍候",visibleText:"进喜已现身",promptText:"请将摄像头对准进喜识别图"}
};
