"use strict";
var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";
module.exports={
  effects:[
    {key:"dun",label:"盾",url:base+"FrameAnimation/dun.glb",scale:[0.4,0.4,0.4],position:[0,-0.5,0.5]},
    {key:"shan",label:"山",url:base+"FrameAnimation/shan.glb",scale:[1,1,0.7],position:[0,-2,1]},
    {key:"dcdy02",label:"法阵",url:base+"FrameAnimation/dcdy02.glb",scale:[0.5,0.5,0.5],position:[0,-0.5,0.5]},
    {key:"sgd",label:"文字",url:base+"Model/otherModel/sgd.glb",scale:[3.2,3.2,3.2],position:[0,-0.5,-0.5]}
  ],
  audio:{ambient:base+"Audio/"+encodeURIComponent("环境音.MP3"),narration:base+"Audio/"+encodeURIComponent("石敢当本当.mp3")}
};
