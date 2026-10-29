const assert=require('node:assert/strict');
const fs=require('node:fs');
const cv=require('../pages/ar-native-track/vendor/jsfeat.js');
const features=require('../pages/ar-native-track/features.js');
const {Tracker,project}=require('../pages/ar-native-track/tracker.js');
const glb=require('../pages/ar-native-track/glb.js');
const animation=require('../pages/ar-native-track/animation.js');
const {effectRoot}=require('../pages/ar-native-track/model-renderer.js');
const scene=require('../pages/ar-native-track/scenes/zhao-cai.js');

function bytes(file){
  const value=fs.readFileSync(file);
  return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);
}
function read(file,effect){return glb.parse(bytes(file),{...scene.model,effect});}

const mainFiles={
  reference:'recovery-assets/models/Model/GoldModel/dcdy_jinbi.glb',
  jade:'recovery-assets/models/Model/MoyuModel/dcdy_moyu.glb'
};
const mains={};
for(const key of Object.keys(mainFiles)){
  const model=read(mainFiles[key],false);mains[key]=model;
  assert(model.primitives.length>0,key+' main model must contain meshes');
  assert(model.primitives.every(part=>part.indices instanceof Uint16Array),key+' must remain WebGL 1 compatible');
  assert(model.primitives.every(part=>part.image&&part.image.bytes.byteLength>0),key+' textures must remain embedded');
}

const effectFiles={
  'dcdy02-1':'recovery-assets/models/FrameAnimation/dcdy02 (1).glb',
  'long-1':'recovery-assets/models/FrameAnimation/long(1).glb',
  dcdyhr:'recovery-assets/models/FrameAnimation/dcdyhr.glb'
};
const effectReport=[];
for(const definition of scene.effects.effects){
  const model=read(effectFiles[definition.key],true);
  assert(model.primitives.length>0,definition.key+' must contain meshes');
  assert(model.clips.length>0,definition.key+' must retain authored animation');
  const root=effectRoot(mains.reference.alignment,definition);
  for(const second of [0,.5,2.5,6,12.5]){
    for(const matrix of animation.matrices(model,second))if(matrix)assert([...root,...matrix].every(Number.isFinite));
  }
  effectReport.push({key:definition.key,primitives:model.primitives.length,duration:model.clips[0].duration,channels:model.clips[0].channels.length});
}

const input=process.argv[2];
if(!input)throw new Error('Usage: node test-native-zhao-cai.cjs RESIZED_TARGET_RGBA');
const target=scene.target,reference=new Uint8Array(fs.readFileSync(input));
assert.equal(reference.length,target.width*target.height*4);
const gray=features.grayscale(reference,target.width,target.height),tracker=new Tracker(target),width=480,height=640;
function rgba(data){const out=new Uint8Array(data.length*4);for(let i=0;i<data.length;i++){out[i*4]=out[i*4+1]=out[i*4+2]=data[i];out[i*4+3]=255;}return out;}
function detect(name,homography){
  const matrix=new cv.matrix_t(3,3,cv.F32C1_t),inverse=new cv.matrix_t(3,3,cv.F32C1_t);
  matrix.data.set(homography);cv.matmath.invert_3x3(matrix,inverse);
  const warped=new cv.matrix_t(width,height,cv.U8C1_t);cv.imgproc.warp_perspective(gray,warped,inverse,180);
  const result=tracker.detect(rgba(warped.data.subarray(0,width*height)),width,height);
  assert(result.found,`${name}: target not detected (${result.matches}/${result.inliers})`);
  const expected=[[0,0],[target.width,0],[target.width,target.height],[0,target.height]].map(point=>project(homography,...point));
  const error=Math.max(...result.corners.map((corner,index)=>Math.hypot(corner.x-expected[index].x,corner.y-expected[index].y)));
  assert(error<10,`${name}: corner error ${error}`);
  return {name,inliers:result.inliers,maxCornerError:Math.round(error*100)/100};
}
const detections=[
  detect('scaled-and-translated',[.65,0,65,0,.65,70,0,0,1]),
  detect('perspective',[.73,.08,50,.04,.71,45,.00025,.00012,1]),
  detect('rotation-90-degrees',[0,-.55,420,.55,0,120,0,0,1])
];
const blank=new Uint8Array(width*height*4).fill(180);
assert.equal(tracker.detect(blank,width,height).found,false,'blank frame must not match');

console.log(JSON.stringify({passed:true,targetFeatures:target.points.length,mainModels:Object.fromEntries(Object.entries(mains).map(([key,value])=>[key,{primitives:value.primitives.length}])),effects:effectReport,detections},null,2));
