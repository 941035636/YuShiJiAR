"use strict";
// Marker axes: x right, y down, z away from camera. All distances use card height=1.
var cv = require("./vendor/jsfeat.js");
function length(v) { return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); }
function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function unit(v) { var n=length(v);return v.map(function(x){return x/n;}); }
function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function multiply(a,b) {
  var out=new Float32Array(16);
  for(var c=0;c<4;c++)for(var r=0;r<4;r++)for(var k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
  return out;
}
function solve(corners,width,height,aspect,fov) {
  if(!corners||corners.length!==4||!(width>0&&height>0&&aspect>0&&fov>=30&&fov<=90))return null;
  var source=[{x:-aspect/2,y:-0.5},{x:aspect/2,y:-0.5},{x:aspect/2,y:0.5},{x:-aspect/2,y:0.5}];
  if(corners.some(function(p){return !isFinite(p.x)||!isFinite(p.y);}))return null;
  var kernel=new cv.motion_model.homography2d(),model=new cv.matrix_t(3,3,cv.F32C1_t);
  if(!kernel.check_subset(source,corners,4)||!kernel.run(source,corners,model,4))return null;
  var h=model.data,f=height/(2*Math.tan(fov*Math.PI/360)),cx=width/2,cy=height/2;
  var a=[(h[0]-cx*h[6])/f,(h[3]-cy*h[6])/f,h[6]];
  var b=[(h[1]-cx*h[7])/f,(h[4]-cy*h[7])/f,h[7]];
  var t=[(h[2]-cx*h[8])/f,(h[5]-cy*h[8])/f,h[8]];
  var scale=2/(length(a)+length(b));if(t[2]<0)scale=-scale;
  a=a.map(function(x){return x*scale;});b=b.map(function(x){return x*scale;});t=t.map(function(x){return x*scale;});
  if(!isFinite(scale)||length(a)<1e-6||length(b)<1e-6||t[2]<0.05||t[2]>100)return null;
  var r1=unit(a),projection=dot(r1,b),r2=unit(b.map(function(x,i){return x-projection*r1[i];})),r3=cross(r1,r2);
  if(r2.some(function(x){return !isFinite(x);})||r3[2]<=0)return null;
  var view=new Float32Array([r1[0],r1[1],r1[2],0,r2[0],r2[1],r2[2],0,r3[0],r3[1],r3[2],0,t[0],t[1],t[2],1]);
  var near=0.01,far=100;
  var camera=new Float32Array([2*f/width,0,0,0,0,-2*f/height,0,0,0,0,(far+near)/(far-near),1,0,0,-2*far*near/(far-near),0]);
  var error=0;
  for(var i=0;i<4;i++){
    var p=source[i],x=r1[0]*p.x+r2[0]*p.y+t[0],y=r1[1]*p.x+r2[1]*p.y+t[1],z=r1[2]*p.x+r2[2]*p.y+t[2];
    if(z<=near)return null;
    error=Math.max(error,Math.sqrt(Math.pow(f*x/z+cx-corners[i].x,2)+Math.pow(f*y/z+cy-corners[i].y,2)));
  }
  // Approximate intrinsics are acceptable for calibration, but reject grossly inconsistent poses.
  if(error>Math.max(15,Math.sqrt(width*width+height*height)*0.08))return null;
  return {view:view,projection:camera,mvp:multiply(camera,view),error:error};
}
module.exports={solve:solve,multiply:multiply};
