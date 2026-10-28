"use strict";
var config=require("./model-config.js");
var defaults={variantKey:config.defaultVariant,modelScale:100,modelOffset:0,fov:config.fov,exposure:config.lighting.exposure,effectExposure:config.lighting.effectExposure,renderMode:"pbr",quality:"balanced"};
function sanitize(value){
  value=value||{};var result={variantKey:config.variants[value.variantKey]?value.variantKey:defaults.variantKey,renderMode:value.renderMode==="simple"?"simple":"pbr"};
  result.quality=["performance","balanced","high"].indexOf(value.quality)>=0?value.quality:defaults.quality;
  var limits={modelScale:[50,150],modelOffset:[-25,25],fov:[30,80],exposure:[.5,2],effectExposure:[.5,3]};
  Object.keys(limits).forEach(function(key){var number=Number(value[key]);result[key]=value[key]!==undefined&&isFinite(number)?Math.max(limits[key][0],Math.min(limits[key][1],number)):defaults[key];});
  return result;
}
function layout(frameWidth,frameHeight,width,height,debug){
  var ratio=frameWidth>0&&frameHeight>0?frameHeight/frameWidth:4/3;
  width=width>0?width:375;height=height>0?height:667;
  var stageHeight=debug?Math.round(width*ratio):height;
  var scale=Math.max(1,stageHeight/(width*ratio)),canvasWidth=width*scale,canvasHeight=canvasWidth*ratio;
  return {stageHeight:stageHeight,canvasWidth:canvasWidth,canvasHeight:canvasHeight,canvasLeft:(width-canvasWidth)/2,canvasTop:(stageHeight-canvasHeight)/2};
}
module.exports={defaults:defaults,sanitize:sanitize,layout:layout,storageKey:"ysj-native-visual-v1"};
