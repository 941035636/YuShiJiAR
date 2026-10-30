const assert=require('node:assert/strict');
const fs=require('node:fs');
const cv=require('../pages/ar-native-track/vendor/jsfeat.js');
const features=require('../pages/ar-native-track/features.js');
const {Tracker,project}=require('../pages/ar-native-track/tracker.js');
const glb=require('../pages/ar-native-track/glb.js');
const animation=require('../pages/ar-native-track/animation.js');
const {effectRoot}=require('../pages/ar-native-track/model-renderer.js');
const scene=require('../pages/ar-native-track/scenes/bixia-yuanjun.js');

function bytes(file){const value=fs.readFileSync(file);return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);}
const main=glb.parse(bytes('recovery-assets/models/NewScenes/BixiaYuanjun/bixia-yuanjun-mobile-v2.glb'),scene.model);
assert.equal(main.primitives.length,1);
assert.equal(main.primitives.reduce((n,p)=>n+p.vertices.length/8,0),56838);
assert.equal(main.primitives.reduce((n,p)=>n+p.indices.length/3,0),70000);
assert(main.primitives.every(p=>p.indices instanceof Uint16Array),'main asset must remain WebGL 1 compatible');
assert(main.primitives.every(p=>p.image&&p.normalImage&&p.materialImage),'main asset keeps its embedded PBR textures');

const aura=glb.parse(bytes('recovery-assets/models/NewScenes/BixiaYuanjun/bixia-aura-prototype.glb'),{...scene.model,effect:true});
assert.equal(aura.primitives.length,6);
assert.equal(aura.primitives.reduce((n,p)=>n+p.vertices.length/8,0),626);
assert.equal(aura.primitives.reduce((n,p)=>n+p.indices.length/3,0),608);
assert(aura.primitives.every(p=>p.transparent),'aura geometry is blended');
assert.equal(aura.clips.length,1);assert.equal(aura.clips[0].duration,12);assert.equal(aura.clips[0].channels.length,5);
const root=effectRoot(main.alignment,scene.effects.effects[0]);
for(const second of [0,.5,3,6,11.9])for(const matrix of animation.matrices(aura,second))if(matrix)assert([...root,...matrix].every(Number.isFinite));

const input=process.argv[2];
if(!input)throw new Error('Usage: node test-native-bixia-yuanjun.cjs RESIZED_TARGET_RGBA');
const target=scene.target,reference=new Uint8Array(fs.readFileSync(input));
assert.equal(reference.length,target.width*target.height*4);
const gray=features.grayscale(reference,target.width,target.height),tracker=new Tracker(target),width=640,height=640;
function rgba(data){const out=new Uint8Array(data.length*4);for(let i=0;i<data.length;i++){out[i*4]=out[i*4+1]=out[i*4+2]=data[i];out[i*4+3]=255;}return out;}
function frame(h){const matrix=new cv.matrix_t(3,3,cv.F32C1_t),inverse=new cv.matrix_t(3,3,cv.F32C1_t);matrix.data.set(h);cv.matmath.invert_3x3(matrix,inverse);const warped=new cv.matrix_t(width,height,cv.U8C1_t);cv.imgproc.warp_perspective(gray,warped,inverse,180);return rgba(warped.data.subarray(0,width*height));}
function error(result,h){const expected=[[0,0],[target.width,0],[target.width,target.height],[0,target.height]].map(p=>project(h,...p));return Math.max(...result.corners.map((corner,index)=>Math.hypot(corner.x-expected[index].x,corner.y-expected[index].y)));}
function detect(name,h){const result=tracker.detect(frame(h),width,height);assert(result.found,`${name}: target not detected (${result.matches}/${result.inliers})`);const e=error(result,h);assert(e<10,`${name}: corner error ${e}`);return {name,inliers:result.inliers,maxCornerError:Math.round(e*100)/100};}
const detections=[
  detect('scaled-and-translated',[.78,0,115,0,.78,15,0,0,1]),
  detect('perspective',[.82,.07,80,.03,.78,35,.00018,.0001,1]),
  detect('rotation-90-degrees',[0,-.72,530,.72,0,120,0,0,1])
];
assert.equal(tracker.detect(new Uint8Array(width*height*4).fill(180),width,height).found,false,'blank frame must not match');
console.log(JSON.stringify({passed:true,targetFeatures:target.points.length,model:{primitives:1,vertices:56838,triangles:70000},aura:{primitives:6,vertices:626,triangles:608,duration:12,channels:5},detections},null,2));
