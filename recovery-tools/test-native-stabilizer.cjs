const assert=require('node:assert/strict');
const {TrackingStabilizer}=require('../pages/ar-native-track/stabilizer.js');
function result(corners){return {found:true,corners,mode:'track',matches:30,inliers:25,elapsedMs:20};}
function square(x,y,size){return [{x,y},{x:x+size,y},{x:x+size,y:y+size},{x,y:y+size}];}
function center(corners){return corners.reduce((sum,p)=>sum+p.x,0)/4;}
const stable=new TrackingStabilizer({holdMs:170});
let now=1000,rawMovement=0,smoothMovement=0,lastRaw,lastSmooth;
for(let i=0;i<30;i++){
  const jitter=(i%4-1.5)*1.6,raw=square(100+jitter,80-jitter,180),out=stable.update(result(raw),now);now+=80;
  if(lastRaw){rawMovement+=Math.abs(center(raw)-center(lastRaw));smoothMovement+=Math.abs(center(out.corners)-center(lastSmooth));}
  lastRaw=raw;lastSmooth=out.corners;
}
assert(smoothMovement<rawMovement*0.55,'stationary jitter must be substantially reduced');
const before=center(lastSmooth),moving=stable.update(result(square(125,80,180)),now);now+=80;
assert(center(moving.corners)>before+8,'intentional motion must remain responsive');
const outlier=stable.update(result(square(430,260,180)),now);now+=80;
assert.equal(outlier.stabilityMode,'异常值抑制');assert(center(outlier.corners)<250,'single outlier must not move the model');
const confirmed=stable.update(result(square(434,262,180)),now);now+=80;
assert(center(confirmed.corners)>250,'two consistent large-motion frames must recover');
const held=stable.update({found:false,corners:[],mode:'track'},now);assert.equal(held.found,true);assert.equal(held.stabilityMode,'短时保持');
now+=200;const lost=stable.update({found:false,corners:[],mode:'detect'},now);assert.equal(lost.found,false);assert.deepEqual(lost.corners,[]);
stable.reset();assert.equal(stable.update({found:false,corners:[]},now).found,false);
console.log(JSON.stringify({passed:true,rawMovement,smoothMovement,jitterReduction:1-smoothMovement/rawMovement},null,2));
