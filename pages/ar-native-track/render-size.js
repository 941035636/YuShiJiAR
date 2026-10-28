"use strict";
// Source pixels remain the pose/recognition coordinate system. Only the GPU target grows.
function size(width,height,displayWidth,pixelRatio,quality,limit){
  if(quality==="performance"||!(displayWidth>0))return {width:width,height:height};
  var density=Math.max(1,Math.min(Number(pixelRatio)||1,quality==="high"?2.5:2));
  var scale=Math.max(1,displayWidth*density/width);
  var maxSide=Math.min(limit||4096,quality==="high"?2048:1600),maxPixels=quality==="high"?2400000:1600000;
  scale=Math.min(scale,maxSide/Math.max(width,height),Math.sqrt(maxPixels/(width*height)));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
module.exports={size:size};
