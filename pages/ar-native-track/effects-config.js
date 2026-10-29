"use strict";
var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";
module.exports={
  effects:[
    // Keep emissive effects independently calibrated. A single high exposure washed out
    // the text while tuning the shield and magic circle on Harmony devices.
    {key:"dun",label:"盾",url:base+"FrameAnimation/dun.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.5],exposure:1.35},
    {key:"shan",label:"山",url:base+"FrameAnimation/shan.glb",scale:[1,1,0.7],position:[0,-2,1],exposure:1.1},
    {key:"dcdy02",label:"法阵",url:base+"FrameAnimation/dcdy02.glb",scale:[0.5,0.5,0.5],position:[0,-0.5,0.5],exposure:1.3},
    // The source text material is yellow-orange and sits over a bright gold mountain.
    // A brown contrast tint preserves the authored mesh while keeping the glyphs readable.
    {key:"sgd",label:"文字",url:base+"Model/otherModel/sgd.glb",scale:[3.2,3.2,3.2],position:[0,-0.5,-0.5],exposure:0.55,tint:[1,0.45,0.75]}
  ],
  profileLabel:"盾 135% / 山 110% / 法阵 130% / 文字 55%（深金）",
  readyText:"盾、山、法阵、文字特效已就绪",
  audio:{ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),narration:base+"Audio/"+encodeURIComponent("石敢当本当.mp3")}
};
