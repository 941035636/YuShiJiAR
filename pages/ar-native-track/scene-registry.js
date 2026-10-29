"use strict";

var catalog={
  "ben-zun":{key:"ben-zun",name:"本尊",nativeReady:true},
  "chang-sheng":{key:"chang-sheng",name:"常胜",nativeReady:true},
  "zhao-cai":{key:"zhao-cai",name:"招财",nativeReady:true},
  "zi-zai":{key:"zi-zai",name:"自在",nativeReady:true},
  "jin-xi":{key:"jin-xi",name:"进喜",nativeReady:true},
  "na-fu":{key:"na-fu",name:"纳福",nativeReady:false}
};

var nativeScenes={
  "ben-zun":require("./scenes/ben-zun.js"),
  "chang-sheng":require("./scenes/chang-sheng.js"),
  "zhao-cai":require("./scenes/zhao-cai.js"),
  "zi-zai":require("./scenes/zi-zai.js"),
  "jin-xi":require("./scenes/jin-xi.js")
};

function normalize(key){return String(key||"ben-zun").trim().toLowerCase();}
function getCatalog(){return Object.keys(catalog).map(function(key){return catalog[key];});}
function getNative(key){return nativeScenes[normalize(key)]||null;}
function requireNative(key){
  key=normalize(key);
  var scene=getNative(key);
  if(scene)return scene;
  var item=catalog[key];
  throw new Error(item?item.name+"场景尚未完成鸿蒙原生适配":"未知场景："+key);
}

module.exports={catalog:catalog,getCatalog:getCatalog,getNative:getNative,requireNative:requireNative};
