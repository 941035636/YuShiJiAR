"use strict";
var cv = require("./vendor/jsfeat.js");
var geometry = require("./tracker.js");
var MAX_POINTS = 48;

function pyramid(width, height) {
  var p = new cv.pyramid_t(3);
  p.allocate(width, height, cv.U8C1_t);
  return p;
}
function scaledGrayscale(rgba, width, height, target, xMap, yMap) {
  var out=target.data,tw=target.cols,th=target.rows;
  for(var y=0;y<th;y++){
    var sourceRow=yMap[y]*width;
    for(var x=0;x<tw;x++){
      var source=(sourceRow+xMap[x])*4;
      out[y*tw+x]=(rgba[source]*77+rgba[source+1]*150+rgba[source+2]*29+128)>>8;
    }
  }
}
function patchError(a, b, width, x, y, u, v) {
  var sum = 0, absolute = 0, values = [];
  // Zero-mean patch differences tolerate a moderate overall brightness change.
  for (var dy = -3; dy <= 3; dy += 2) {
    for (var dx = -3; dx <= 3; dx += 2) {
      var d = a[(Math.round(y)+dy)*width+Math.round(x)+dx] - b[(Math.round(v)+dy)*width+Math.round(u)+dx];
      values.push(d); sum += d;
    }
  }
  sum /= values.length;
  for (var i = 0; i < values.length; i++) absolute += Math.abs(values[i]-sum);
  return absolute / values.length;
}
function SessionTracker(target, options) {
  this.target = target;
  var reverifyMs=Number(options&&options.reverifyMs);
  this.reverifyMs=isFinite(reverifyMs)&&reverifyMs>=500?Math.min(5000,reverifyMs):5000;
  this.detector = new geometry.Tracker(target);
  this.xy = new Float32Array(MAX_POINTS*2);
  this.forward = new Float32Array(MAX_POINTS*2);
  this.backward = new Float32Array(MAX_POINTS*2);
  this.forwardStatus = new Uint8Array(MAX_POINTS);
  this.backwardStatus = new Uint8Array(MAX_POINTS);
  this.reset();
}
SessionTracker.prototype.reset = function () { this.state = null; };
SessionTracker.prototype.prepare = function (rgba, width, height, needDetection) {
  if (!(width >= 48 && height >= 48) || rgba.byteLength !== width*height*4) throw new Error("相机帧格式不正确");
  var ratio = Math.min(1,480/Math.max(width,height));
  var w = Math.round(width*ratio), h = Math.round(height*ratio);
  var trackRatio = Math.min(1,400/Math.max(width,height));
  var tw = Math.round(width*trackRatio), th = Math.round(height*trackRatio);
  if (this.frameWidth !== width || this.frameHeight !== height) {
    this.reset();
    this.frameWidth=width;this.frameHeight=height;
    this.source = new cv.matrix_t(width,height,cv.U8C1_t);
    this.small = new cv.matrix_t(w,h,cv.U8C1_t);
    this.trackingGray = new cv.matrix_t(tw,th,cv.U8C1_t);
    this.previous = pyramid(tw,th); this.current = pyramid(tw,th);
    this.xMap=new Uint16Array(tw);this.yMap=new Uint16Array(th);
    for(var x=0;x<tw;x++)this.xMap[x]=Math.min(width-1,Math.floor((x+0.5)/trackRatio));
    for(var y=0;y<th;y++)this.yMap[y]=Math.min(height-1,Math.floor((y+0.5)/trackRatio));
  }
  if(trackRatio<1)scaledGrayscale(rgba,width,height,this.trackingGray,this.xMap,this.yMap);
  else cv.imgproc.grayscale(rgba,width,height,this.trackingGray,cv.COLOR_RGBA2GRAY);
  this.current.build(this.trackingGray,false);
  var gray=null;
  if(needDetection){
    cv.imgproc.grayscale(rgba,width,height,this.source,cv.COLOR_RGBA2GRAY);gray=this.source;
    if(ratio<1){cv.imgproc.resample(this.source,this.small,w,h);gray=this.small;}
  }
  return {gray:gray,ratio:ratio,trackRatio:trackRatio};
};
SessionTracker.prototype.remember = function (result, ratio, now, detectedAt) {
  if (!result.found) { this.reset(); return; }
  var support = result.support, cells = {}, reference = [], image = [];
  for (var i = 0; i < support.target.length && reference.length < MAX_POINTS; i++) {
    var t = support.target[i], p = support.image[i];
    var cell = Math.floor(t.x*6/this.target.width)+":"+Math.floor(t.y*6/this.target.height);
    if ((cells[cell]||0) >= 4) continue;
    cells[cell] = (cells[cell]||0)+1;
    reference.push(t); image.push({x:p.x*ratio,y:p.y*ratio});
  }
  if (reference.length < 12) { this.reset(); return; }
  this.state = {reference:reference,image:image,at:now,detectedAt:detectedAt};
  var previous = this.previous; this.previous = this.current; this.current = previous;
};
SessionTracker.prototype.follow = function (width, height, ratio) {
  var state = this.state, count = state.image.length, i;
  for (i = 0; i < count; i++) { this.xy[i*2]=state.image[i].x; this.xy[i*2+1]=state.image[i].y; }
  // Forward/backward agreement rejects occluded and incorrectly tracked points.
  cv.optical_flow_lk.track(this.previous,this.current,this.xy,this.forward,count,15,15,this.forwardStatus,0.02,0.001);
  cv.optical_flow_lk.track(this.current,this.previous,this.forward,this.backward,count,15,15,this.backwardStatus,0.02,0.001);
  var from = [], to = [], w = this.current.data[0].cols, h = this.current.data[0].rows;
  for (i = 0; i < count; i++) {
    var x=this.xy[i*2],y=this.xy[i*2+1],u=this.forward[i*2],v=this.forward[i*2+1];
    if (!this.forwardStatus[i] || !this.backwardStatus[i] || !isFinite(u) || !isFinite(v) ||
        x<4 || y<4 || x>=w-4 || y>=h-4 || u<4 || v<4 || u>=w-4 || v>=h-4) continue;
    var dx=this.backward[i*2]-x,dy=this.backward[i*2+1]-y;
    if (!isFinite(dx)||!isFinite(dy)||dx*dx+dy*dy > 2.25 || patchError(this.previous.data[0].data,this.current.data[0].data,w,x,y,u,v)>22) continue;
    from.push(state.reference[i]); to.push({x:u,y:v});
  }
  var result = {found:false,matches:from.length,inliers:0,corners:[],mode:"track"};
  if (from.length < 12) return result;
  var fit = geometry.estimateHomography(from,to,1.8,64), goodFrom=[],goodTo=[];
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (i=0;i<from.length;i++) if (fit.mask[i]) {
    goodFrom.push(from[i]); goodTo.push({x:to[i].x/ratio,y:to[i].y/ratio});
    minX=Math.min(minX,from[i].x);minY=Math.min(minY,from[i].y);
    maxX=Math.max(maxX,from[i].x);maxY=Math.max(maxY,from[i].y);
  }
  result.inliers=goodFrom.length;
  if (goodFrom.length<12 || goodFrom.length/from.length<0.65 ||
      (maxX-minX)*(maxY-minY)/(this.target.width*this.target.height)<0.04) return result;
  var target=this.target;
  var corners=[[0,0],[target.width,0],[target.width,target.height],[0,target.height]].map(function(p){
    var q=geometry.project(fit.model.data,p[0],p[1]); return {x:q.x/ratio,y:q.y/ratio};
  });
  if (!geometry.validQuad(corners,width,height)) return result;
  result.found=true;result.corners=corners;
  result.support={target:goodFrom,image:goodTo};
  return result;
};
SessionTracker.prototype.update = function (rgba, width, height, now) {
  now = typeof now === "number" ? now : Date.now();
  var begin=Date.now(),sameSize=this.frameWidth===width&&this.frameHeight===height;
  var canFollow=sameSize&&this.state&&now-this.state.at<=500&&now-this.state.detectedAt<this.reverifyMs;
  var prepared=this.prepare(rgba,width,height,!canFollow), result;
  // Periodic descriptor verification limits accumulated drift; long gaps use recognition again.
  if (canFollow) {
    result=this.follow(width,height,prepared.trackRatio);
    if (result.found) {
      // Keep the descriptor-verified keyframe as the reference. Chaining each
      // estimated frame into the next accumulates drift in the card's white border.
      this.state.at=now;
      result.elapsedMs=Date.now()-begin;return result;
    }
    // Hide the old outline immediately. Run recognition on the next scheduled frame.
    this.reset();result.elapsedMs=Date.now()-begin;return result;
  }
  result=this.detector.detect(rgba,width,height,prepared);result.mode="detect";
  this.remember(result,prepared.trackRatio,now,now);
  result.elapsedMs=Date.now()-begin;return result;
};
module.exports = {SessionTracker:SessionTracker,scaledGrayscale:scaledGrayscale};
