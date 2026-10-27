"use strict";

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { var x=a.x-b.x,y=a.y-b.y;return Math.sqrt(x*x+y*y); }
function copyCorners(corners) { return corners.map(function(p){return {x:p.x,y:p.y};}); }
function metrics(corners) {
  var center={x:0,y:0},size=0;
  corners.forEach(function(p){center.x+=p.x;center.y+=p.y;});center.x/=4;center.y/=4;
  for(var i=0;i<4;i++)size+=distance(corners[i],corners[(i+1)%4]);
  return {center:center,size:size/4};
}
function similar(a,b) {
  var am=metrics(a),bm=metrics(b),base=Math.max(20,Math.min(am.size,bm.size)*0.2);
  return distance(am.center,bm.center)<=base&&am.size/bm.size>0.7&&am.size/bm.size<1.45;
}
function copyResult(result) {
  var out={};Object.keys(result||{}).forEach(function(key){out[key]=result[key];});
  out.corners=copyCorners((result&&result.corners)||[]);return out;
}

function TrackingStabilizer(options) {
  options=options||{};this.holdMs=options.holdMs||170;this.reset();
}
TrackingStabilizer.prototype.reset=function(){this.current=null;this.lastGoodAt=0;this.lastUpdateAt=0;this.pending=null;};
TrackingStabilizer.prototype.isJump=function(corners) {
  if(!this.current)return false;
  var old=metrics(this.current),next=metrics(corners),ratio=next.size/Math.max(1,old.size),maxMove=0;
  for(var i=0;i<4;i++)maxMove=Math.max(maxMove,distance(this.current[i],corners[i]));
  return distance(old.center,next.center)>Math.max(42,old.size*0.55)||ratio<0.55||ratio>1.8||maxMove>Math.max(64,old.size*0.8);
};
TrackingStabilizer.prototype.held=function(result,reason) {
  var out=copyResult(result);out.found=true;out.corners=copyCorners(this.current);out.held=true;out.stabilityMode=reason;return out;
};
TrackingStabilizer.prototype.update=function(result,now) {
  now=typeof now==="number"?now:Date.now();result=result||{found:false,corners:[]};
  if(!result.found||!result.corners||result.corners.length!==4){
    this.pending=null;
    if(this.current&&now-this.lastGoodAt<=this.holdMs)return this.held(result,"短时保持");
    this.current=null;this.lastUpdateAt=0;var lost=copyResult(result);lost.found=false;lost.corners=[];lost.stabilityMode="目标丢失";return lost;
  }
  var raw=copyCorners(result.corners);
  if(this.current&&this.isJump(raw)){
    if(!this.pending||!similar(this.pending,raw)){
      this.pending=raw;
      if(now-this.lastGoodAt<=this.holdMs)return this.held(result,"异常值抑制");
    }else this.pending=null;
  }else this.pending=null;
  if(!this.current)this.current=raw;
  else{
    var dt=clamp(now-(this.lastUpdateAt||now-80),16,180),old=metrics(this.current),motion=0;
    for(var i=0;i<4;i++)motion+=distance(this.current[i],raw[i]);motion=motion/4/Math.max(40,old.size);
    var base=clamp(0.22+motion*4.8,0.22,0.86),alpha=1-Math.pow(1-base,dt/80);
    for(var n=0;n<4;n++){
      var dx=raw[n].x-this.current[n].x,dy=raw[n].y-this.current[n].y;
      if(Math.abs(dx)>0.35)this.current[n].x+=dx*alpha;
      if(Math.abs(dy)>0.35)this.current[n].y+=dy*alpha;
    }
  }
  this.lastGoodAt=now;this.lastUpdateAt=now;
  var out=copyResult(result);out.corners=copyCorners(this.current);out.held=false;out.stabilityMode="自适应平滑";return out;
};

module.exports={TrackingStabilizer:TrackingStabilizer};
