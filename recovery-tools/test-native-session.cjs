const assert = require('node:assert/strict');
const fs = require('node:fs');
const cv = require('../pages/ar-native-track/vendor/jsfeat.js');
const {SessionTracker} = require('../pages/ar-native-track/session-tracker.js');
const {project} = require('../pages/ar-native-track/tracker.js');
const features = require('../pages/ar-native-track/features.js');
const target = require('../pages/ar-native-track/target.js');
const reference = new Uint8Array(fs.readFileSync(process.argv[2]));
assert.equal(reference.length, target.width*target.height*4);
const gray = features.grayscale(reference,target.width,target.height);
const width=480,height=640,tracker=new SessionTracker(target),samples=[];
let now=10000;
function rgba(data){const a=new Uint8Array(width*height*4);for(let i=0;i<width*height;i++){a[i*4]=a[i*4+1]=a[i*4+2]=data[i];a[i*4+3]=255;}return a;}
function frame(h, bright=0) {
  const matrix=new cv.matrix_t(3,3,cv.F32C1_t),inverse=new cv.matrix_t(3,3,cv.F32C1_t);
  matrix.data.set(h);cv.matmath.invert_3x3(matrix,inverse);
  const warped=new cv.matrix_t(width,height,cv.U8C1_t);cv.imgproc.warp_perspective(gray,warped,inverse,180);
  const bytes=rgba(warped.data);
  if(bright)for(let i=0;i<bytes.length;i+=4){bytes[i]=bytes[i+1]=bytes[i+2]=Math.min(255,bytes[i]+bright);}
  return bytes;
}
function check(name,h,expectedMode,bright=0) {
  const result=tracker.update(frame(h,bright),width,height,now);now+=80;
  assert(result.found, `${name}: lost (${result.mode}, ${result.matches}/${result.inliers})`);
  if(expectedMode)assert.equal(result.mode,expectedMode,name);
  const truth=[[0,0],[target.width,0],[target.width,target.height],[0,target.height]].map(p=>project(h,...p));
  const error=Math.max(...truth.map((p,i)=>Math.hypot(p.x-result.corners[i].x,p.y-result.corners[i].y)));
  assert(error<10,`${name}: corner error ${error}`);
  samples.push({name,mode:result.mode,elapsedMs:result.elapsedMs,error});
}
const initial=[.65,0,65,0,.65,70,0,0,1];
check('initial',initial,'detect');
for(let i=1;i<=35;i++) {
  const a=i*.004,s=.65+i*.0004;
  check('motion-'+i,[s*Math.cos(a),-s*Math.sin(a),65+i*.7,s*Math.sin(a),s*Math.cos(a),70-i*.3,i*.000002,i*.000001,1],'track',i>=12?8:0);
}
const blank=rgba(new Uint8Array(width*height).fill(180));
assert.equal(tracker.update(blank,width,height,now).found,false,'remove target must not freeze last outline');now+=80;
assert.equal(tracker.update(blank,width,height,now).found,false,'blank reacquisition false positive');now+=80;
check('reacquire',initial,'detect');
now+=800;check('long-gap',initial,'detect');
tracker.reset();check('explicit-reset',initial,'detect');
assert.equal(tracker.update(new Uint8Array(640*480*4),640,480,now).found,false,'size change must discard old tracking');now+=80;
check('reacquire-after-size-change',initial,'detect');
if(process.argv[3]) {
  const unrelated=new Uint8Array(fs.readFileSync(process.argv[3]));
  assert.equal(tracker.update(unrelated,width,height,now).found,false,'unrelated after tracking false positive');now+=80;
  assert.equal(tracker.update(unrelated,width,height,now).found,false,'unrelated reacquisition false positive');now+=80;
  check('reacquire-after-unrelated',initial,'detect');
}
const tracking=samples.filter(s=>s.mode==='track');
const sorted=tracking.map(s=>s.elapsedMs).sort((a,b)=>a-b);
console.log(JSON.stringify({passed:true,frames:samples.length,trackingFrames:tracking.length,
  maxCornerError:Math.max(...samples.map(s=>s.error)),
  trackingMedianMs:sorted[Math.floor(sorted.length/2)],trackingMaxMs:Math.max(...sorted),
  detectionMs:samples.filter(s=>s.mode==='detect').map(s=>s.elapsedMs)},null,2));
