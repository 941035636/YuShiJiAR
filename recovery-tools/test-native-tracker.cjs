const assert=require('assert'),fs=require('fs'),path=require('path');
const cv=require('../pages/ar-native-track/vendor/jsfeat.js');
const {Tracker,project}=require('../pages/ar-native-track/tracker.js');
const features=require('../pages/ar-native-track/features.js');
const target=require('../pages/ar-native-track/target.js');
const input=process.argv[2];
if(!input)throw new Error('Usage: node test-native-tracker.cjs RESIZED_TARGET_RGBA');
const reference=new Uint8Array(fs.readFileSync(input));
assert.equal(reference.length,target.width*target.height*4);
const gray=features.grayscale(reference,target.width,target.height),tracker=new Tracker(target);
const width=480,height=640,results=[];
function rgba(data){const result=new Uint8Array(data.length*4);for(let i=0;i<data.length;i++){result[i*4]=result[i*4+1]=result[i*4+2]=data[i];result[i*4+3]=255;}return result;}
function test(name,h){
 const transform=new cv.matrix_t(3,3,cv.F32C1_t);transform.data.set(h);
 const inverse=new cv.matrix_t(3,3,cv.F32C1_t);cv.matmath.invert_3x3(transform,inverse);
 const warped=new cv.matrix_t(width,height,cv.U8C1_t);cv.imgproc.warp_perspective(gray,warped,inverse,180);
 const result=tracker.detect(rgba(warped.data.subarray(0,width*height)),width,height);
 const expected=[[0,0],[target.width,0],[target.width,target.height],[0,target.height]].map(p=>project(h,...p));
 assert(result.found,`${name}: target not detected (${result.matches}/${result.inliers})`);
 const maxError=Math.max(...result.corners.map((q,i)=>Math.hypot(q.x-expected[i].x,q.y-expected[i].y)));
 // Synthetic test registration is bounded; real-device precision is unverified.
 assert(maxError<10,`${name}: corner error ${maxError}`);
 results.push({name,inliers:result.inliers,maxCornerError:Math.round(maxError*100)/100,elapsedMs:result.elapsedMs});
}
test('scaled-and-translated',[.65,0,65,0,.65,70,0,0,1]);
const a=Math.PI/12,s=.6;
test('rotation-15-degrees',[s*Math.cos(a),-s*Math.sin(a),160,s*Math.sin(a),s*Math.cos(a),40,0,0,1]);
test('perspective',[.73,.08,50,.04,.71,45,.00025,.00012,1]);
test('rotation-90-degrees',[0,-.55,420,.55,0,120,0,0,1]);
const blank=new Uint8Array(width*height).fill(180);
assert.equal(tracker.detect(rgba(blank),width,height).found,false,'blank false positive');
let seed=12345;const noise=new Uint8Array(width*height);for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;noise[i]=seed>>>24;}
assert.equal(tracker.detect(rgba(noise),width,height).found,false,'noise false positive');
if(process.argv[3]){
 const unrelated=new Uint8Array(fs.readFileSync(process.argv[3]));
 assert.equal(unrelated.length,width*height*4);
 assert.equal(tracker.detect(unrelated,width,height).found,false,'unrelated-image false positive');
}
assert.throws(()=>tracker.detect(new Uint8Array(16),width,height),/格式/);
// After two non-target frames, reacquisition must still work using the same tracker.
test('reacquisition',[.65,0,65,0,.65,70,0,0,1]);
console.log(JSON.stringify({passed:true,results,negativeCases:['blank','noise','invalid-frame'].concat(process.argv[3]?['unrelated-image']:[])},null,2));
