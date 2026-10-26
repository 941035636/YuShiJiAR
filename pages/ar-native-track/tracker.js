"use strict";
var cv = require("./vendor/jsfeat.js");
var features = require("./features.js");
function popcount(v) {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}
function project(h, x, y) {
  var d = h[6] * x + h[7] * y + h[8];
  if (!isFinite(d) || Math.abs(d) < 1e-8) return { x: NaN, y: NaN };
  return { x: (h[0]*x + h[1]*y + h[2])/d, y: (h[3]*x + h[4]*y + h[5])/d };
}
function validQuad(q, width, height) {
  var area = 0, sign = 0;
  for (var i = 0; i < 4; i++) {
    var p = q[i], n = q[(i+1)%4], t = q[(i+2)%4];
    if (!isFinite(p.x) || !isFinite(p.y) || p.x < -width || p.x > 2*width || p.y < -height || p.y > 2*height) return false;
    var cross = (n.x-p.x)*(t.y-n.y) - (n.y-p.y)*(t.x-n.x);
    if (Math.abs(cross) < 10 || (sign && cross*sign < 0)) return false;
    sign = cross;
    area += p.x*n.y - n.x*p.y;
  }
  // Reject reflections, tiny patches, and explosive homographies.
  return area > width*height*0.025 && area < width*height*6;
}
function estimateHomography(from, to, threshold, iterations) {
  // Bounded, repeatable sampling with local optimization. JSFeat's generic
  // estimator can stop early when a chosen prefix is degenerate on this card.
  var kernel = new cv.motion_model.homography2d(), model = new cv.matrix_t(3,3,cv.F32C1_t);
  var best = new cv.matrix_t(3,3,cv.F32C1_t), errors = new Float32Array(from.length);
  var bestMask = [], bestCount = 0, bestError = Infinity, limit = threshold*threshold;
  var seed = (from.length*2654435761 + Math.round(to[0].x*97 + to[0].y*193)) >>> 0;
  function random(max) { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return Math.floor(seed/4294967296*max); }
  function score() {
    kernel.error(from,to,model,errors,from.length);
    var mask=[],count=0,error=0;
    for(var i=0;i<from.length;i++){mask[i]=errors[i]<=limit;if(mask[i]){count++;error+=errors[i];}}
    return {mask:mask,count:count,error:error};
  }
  for(var iteration=0;iteration<(iterations||400);iteration++){
    // Tracked points already passed optical-flow checks; stop after strong consensus.
    if(iterations && iteration>=12 && bestCount>=from.length*0.9 && bestError/bestCount<limit*0.25)break;
    var pool=iteration%3===0?from.length:Math.min(from.length,12+Math.floor(iteration/4));
    var ids=[],a=[],b=[];
    while(ids.length<4){var id=random(pool);if(ids.indexOf(id)<0){ids.push(id);a.push(from[id]);b.push(to[id]);}}
    if(!kernel.check_subset(a,b,4)||!kernel.run(a,b,model,4))continue;
    var current=score();
    if(current.count<bestCount||(current.count===bestCount&&current.error>=bestError))continue;
    // Refine candidates before comparison so near-threshold point matches do
    // not leave a four-point model extrapolating far outside the card.
    for(var pass=0;pass<2&&current.count>=8;pass++){
      var goodA=[],goodB=[];
      for(var j=0;j<from.length;j++)if(current.mask[j]){goodA.push(from[j]);goodB.push(to[j]);}
      if(!kernel.run(goodA,goodB,model,goodA.length))break;
      current=score();
    }
    if(current.count>bestCount||(current.count===bestCount&&current.error<bestError)){
      bestCount=current.count;bestError=current.error;bestMask=current.mask;model.copy_to(best);
    }
  }
  return {model:best,mask:bestMask,count:bestCount};
}
function Tracker(target) {
  this.target = target;
  this.pattern = new Int32Array(target.descriptors);
  this.scratch = {};
}
Tracker.prototype.detect = function (rgba, width, height, prepared) {
  if (!(width >= 48 && height >= 48) || rgba.byteLength !== width*height*4) throw new Error("相机帧格式不正确");
  var begin = Date.now(), gray = prepared ? prepared.gray : features.grayscale(rgba, width, height);
  // Bound CPU work even if a client ignores frame-size=small.
  var ratio = Math.min(1, 480/Math.max(width, height));
  if (ratio < 1 && !prepared) {
    var resized = new cv.matrix_t(Math.round(width*ratio), Math.round(height*ratio), cv.U8C1_t);
    cv.imgproc.resample(gray, resized, resized.cols, resized.rows); gray = resized;
  }
  var query = features.extract(gray, 420, this.scratch), words = query.descriptors.buffer.i32, pattern = this.pattern;
  var candidates = [], points = this.target.points;
  for (var i = 0; i < query.points.length; i++) {
    var best = 257, second = 257, index = -1;
    for (var j = 0; j < points.length; j++) {
      var distance = 0;
      for (var k = 0; k < 8; k++) distance += popcount(words[i*8+k] ^ pattern[j*8+k]);
      if (distance < best) { second = best; best = distance; index = j; }
      else if (distance < second) second = distance;
    }
    if (best <= 64 && best < second * 0.88) candidates.push({ q: i, p: index, distance: best });
  }
  candidates.sort(function (a,b) { return a.distance-b.distance; });
  var used = {}, from = [], to = [];
  candidates.forEach(function (match) {
    // Do not let several query points vote for the same physical target feature.
    var point = points[match.p], cell = Math.round(point.x/5)+":"+Math.round(point.y/5);
    if (used[cell]) return; used[cell] = true;
    from.push({ x: point.x, y: point.y });
    to.push({ x: query.points[match.q].x/ratio, y: query.points[match.q].y/ratio });
  });
  var result = { found: false, matches: from.length, inliers: 0, elapsedMs: Date.now()-begin, corners: [] };
  if (from.length < 12) return result;
  var estimate = estimateHomography(from,to,1.8/ratio),model=estimate.model;
  var goodFrom = [], goodTo = [];
  for (var n = 0; n < from.length; n++) if (estimate.mask[n]) { goodFrom.push(from[n]); goodTo.push(to[n]); }
  result.inliers = goodFrom.length;
  // Rotated low-resolution views can have many descriptor outliers. Require
  // more absolute geometric votes while retaining a usable inlier ratio.
  if (goodFrom.length >= 12 && goodFrom.length/from.length >= 0.3) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    goodFrom.forEach(function(p){ minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y); });
    var coverage = (maxX-minX)*(maxY-minY)/(this.target.width*this.target.height);
    var corners = [[0,0],[this.target.width,0],[this.target.width,this.target.height],[0,this.target.height]].map(function(p){return project(model.data,p[0],p[1]);});
    if (coverage >= 0.04 && validQuad(corners,width,height)) {
      result.found = true; result.corners = corners; result.homography = Array.prototype.slice.call(model.data,0,9);
      // Retain verified correspondences for the lightweight next-frame tracker.
      result.support = { target: goodFrom, image: goodTo };
    }
  }
  result.elapsedMs = Date.now()-begin;
  return result;
};
module.exports = { Tracker: Tracker, project: project, validQuad: validQuad, estimateHomography: estimateHomography };
