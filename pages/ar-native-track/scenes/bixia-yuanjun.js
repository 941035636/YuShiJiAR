"use strict";

var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/NewScenes/BixiaYuanjun/";
var model={
  defaultVariant:"reference",
  variants:{reference:{label:"泰山老奶奶移动端素材",url:base+"bixia-yuanjun-mobile-v2.glb",sizeMB:6.9}},
  url:base+"bixia-yuanjun-mobile-v2.glb",
  maxBytes:10*1024*1024,
  height:0.42,centerX:0,centerY:0.03,fov:50,
  lighting:{exposure:1,ambient:2,key:3,effectExposure:1}
};
var effects={
  effects:[{key:"bixia-aura",label:"碧霞显圣光环",url:base+"bixia-aura-prototype.glb",scale:[0.054,0.054,0.054],position:[0,-0.5,0.474],exposure:1.05}],
  profileLabel:"日轮、山影、祥云与法阵",
  readyText:"碧霞显圣光环已就绪",
  audio:{}
};

module.exports={
  key:"bixia-yuanjun",name:"泰山老奶奶",nativeReady:true,
  target:require("../targets/bixia-yuanjun.js"),
  tracking:{reverifyMs:1500},
  model:model,effects:effects,
  audio:{sources:{}},
  visual:{storageKey:"ysj-native-visual-bixia-yuanjun-v1"},
  ui:{navigationTitle:"泰山老奶奶 AR 体验",title:"泰山老奶奶 · 碧霞显圣",recognitionName:"泰山老奶奶识别图",
    loadingText:"正在加载泰山老奶奶场景，请稍候",visibleText:"碧霞元君已现身",promptText:"请将摄像头对准泰山老奶奶识别图"}
};
