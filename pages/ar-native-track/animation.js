"use strict";
var nodeMatrix=require("./glb.js").nodeMatrix;
var identity=require("./glb.js").identity;
var multiply=require("./pose.js").multiply;
function sample(channel,time){
  var times=channel.times,n=times.length,lo=0,hi=n-1;
  while(lo<hi){var mid=Math.ceil((lo+hi)/2);if(times[mid]<=time)lo=mid;else hi=mid-1;}
  var next=Math.min(lo+1,n-1),t=next===lo||channel.interpolation==="STEP"?0:Math.max(0,Math.min(1,(time-times[lo])/(times[next]-times[lo])));
  var a=Array.prototype.slice.call(channel.values,lo*channel.size,(lo+1)*channel.size),b=Array.prototype.slice.call(channel.values,next*channel.size,(next+1)*channel.size);
  if(channel.path!=="rotation")return a.map(function(x,i){return x*(1-t)+b[i]*t;});
  var dot=0;for(var i=0;i<4;i++)dot+=a[i]*b[i];
  if(dot<0){b=b.map(function(x){return -x;});dot=-dot;}
  dot=Math.min(1,dot);var angle=Math.acos(dot),sin=Math.sin(angle),left=sin<1e-5?1-t:Math.sin((1-t)*angle)/sin,right=sin<1e-5?t:Math.sin(t*angle)/sin;
  var q=a.map(function(x,i){return x*left+b[i]*right;}),length=Math.sqrt(q.reduce(function(sum,x){return sum+x*x;},0));
  if(length<1e-8)throw new Error("动画四元数无效");return q.map(function(x){return x/length;});
}
function matrices(model,seconds){
  var nodes=model.nodes.map(function(node){return {matrix:node.matrix,translation:node.translation,rotation:node.rotation,scale:node.scale};});
  // Existing effects each contain one clip; use the first clip deliberately.
  var clip=model.clips[0];
  if(clip){var time=clip.duration>0?Math.max(0,seconds)%clip.duration:0;clip.channels.forEach(function(channel){nodes[channel.node][channel.path]=sample(channel,time);});}
  var result=[];
  function visit(index,parent){var world=multiply(parent,nodeMatrix(nodes[index]));result[index]=world;(model.nodes[index].children||[]).forEach(function(child){visit(child,world);});}
  model.roots.forEach(function(index){visit(index,identity());});return result;
}
function Clock(){this.reset();}
Clock.prototype.reset=function(){this.elapsed=0;this.at=null;this.active=false;};
Clock.prototype.time=function(visible,now){
  if(this.active&&this.at!==null)this.elapsed+=Math.max(0,Math.min(500,now-this.at));
  this.active=visible;this.at=now;return this.elapsed/1000;
};
module.exports={sample:sample,matrices:matrices,Clock:Clock};
