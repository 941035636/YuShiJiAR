const assert=require('node:assert/strict');
const fs=require('node:fs');
const cv=require('../pages/ar-native-track/vendor/jsfeat.js');
const features=require('../pages/ar-native-track/features.js');
const {Tracker,project}=require('../pages/ar-native-track/tracker.js');
const {SessionTracker}=require('../pages/ar-native-track/session-tracker.js');
const glb=require('../pages/ar-native-track/glb.js');
const animation=require('../pages/ar-native-track/animation.js');
const skinning=require('../pages/ar-native-track/skinning.js');
const {effectRoot}=require('../pages/ar-native-track/model-renderer.js');
const scene=require('../pages/ar-native-track/scenes/na-fu.js');

function bytes(file){const value=fs.readFileSync(file);return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);}
function read(file,effect){return glb.parse(bytes(file),{...scene.model,effect});}

const mainFiles={reference:'recovery-assets/models/Model/GoldModel/SYJD.glb',jade:'recovery-assets/models/Model/MoyuModel/SYJD_moyu.glb'};
const mains={};
for(const key of Object.keys(mainFiles)){
  const model=read(mainFiles[key],false);mains[key]=model;
  assert(model.primitives.length>0,key+' main model must contain meshes');
  assert(model.primitives.every(part=>part.indices instanceof Uint16Array),key+' must remain WebGL 1 compatible');
  assert(model.primitives.every(part=>part.image&&part.image.bytes.byteLength>0),key+' textures must remain embedded');
}

const effectFiles={
  long:'recovery-assets/models/Model/otherModel/long.glb',
  syjd:'recovery-assets/models/FrameAnimation/syjd.glb',
  syjdhr:'recovery-assets/models/FrameAnimation/syjdhr.glb',
  'syjd-text':'recovery-assets/models/Model/otherModel/syjd.glb'
};
assert.throws(
  ()=>glb.parse(bytes(effectFiles.long),{...scene.model,effect:true,maxSkinVertices:undefined}),
  /骨骼网格超出支持范围/,
  'the 8192-vertex default guard must remain active outside explicitly opted-in scenes'
);
const effectReport=[],effectAssets={};
for(const definition of scene.effects.effects){
  const model=read(effectFiles[definition.key],true);
  effectAssets[definition.key]=model;
  assert(model.primitives.length>0,definition.key+' must contain meshes');
  if(definition.key!=='syjd-text')assert(model.clips.length>0,definition.key+' must retain authored animation');
  const root=effectRoot(mains.reference.alignment,definition);
  for(const second of [0,.5,2.5,6,12.5]){
    for(const matrix of animation.matrices(model,second))if(matrix)assert([...root,...matrix].every(Number.isFinite));
  }
  effectReport.push({key:definition.key,primitives:model.primitives.length,duration:model.clips[0]?.duration||0,channels:model.clips[0]?.channels.length||0,skinned:model.primitives.filter(part=>!!part.skin).length});
}
const dragon=effectAssets.long,dragonPart=dragon.primitives[0];
assert(dragonPart.skin,'the authored dragon must keep its skeleton');
const dragonAt0=skinning.deform(dragonPart,skinning.palettes(dragon,animation.matrices(dragon,0))[dragonPart.skin.index]);
const dragonAt1=skinning.deform(dragonPart,skinning.palettes(dragon,animation.matrices(dragon,1))[dragonPart.skin.index]);
assert(dragonAt0.every(Number.isFinite)&&dragonAt1.every(Number.isFinite));
assert(dragonAt0.some((value,index)=>index%8<3&&Math.abs(value-dragonAt1[index])>.01),'dragon skeleton must visibly deform its mesh');
const skinStart=Date.now();
for(let i=0;i<20;i++)skinning.deform(dragonPart,skinning.palettes(dragon,animation.matrices(dragon,i/20*dragon.clips[0].duration))[dragonPart.skin.index]);
const dragonSkinMsPerFrame=(Date.now()-skinStart)/20;

const input=process.argv[2];
if(!input)throw new Error('Usage: node test-native-na-fu.cjs RESIZED_TARGET_RGBA');
const target=scene.target,reference=new Uint8Array(fs.readFileSync(input));
assert.equal(reference.length,target.width*target.height*4);
const gray=features.grayscale(reference,target.width,target.height),tracker=new Tracker(target),width=480,height=640;
function rgba(data){const out=new Uint8Array(data.length*4);for(let i=0;i<data.length;i++){out[i*4]=out[i*4+1]=out[i*4+2]=data[i];out[i*4+3]=255;}return out;}
function frame(homography){
  const matrix=new cv.matrix_t(3,3,cv.F32C1_t),inverse=new cv.matrix_t(3,3,cv.F32C1_t);
  matrix.data.set(homography);cv.matmath.invert_3x3(matrix,inverse);
  const warped=new cv.matrix_t(width,height,cv.U8C1_t);cv.imgproc.warp_perspective(gray,warped,inverse,180);
  return rgba(warped.data.subarray(0,width*height));
}
function cornerError(result,homography){
  const expected=[[0,0],[target.width,0],[target.width,target.height],[0,target.height]].map(point=>project(homography,...point));
  return Math.max(...result.corners.map((corner,index)=>Math.hypot(corner.x-expected[index].x,corner.y-expected[index].y)));
}
function detect(name,homography){
  const result=tracker.detect(frame(homography),width,height);
  assert(result.found,`${name}: target not detected (${result.matches}/${result.inliers})`);
  const error=cornerError(result,homography);assert(error<10,`${name}: corner error ${error}`);
  return {name,inliers:result.inliers,maxCornerError:Math.round(error*100)/100};
}
const detections=[
  detect('scaled-and-translated',[.65,0,65,0,.65,70,0,0,1]),
  detect('perspective',[.73,.08,50,.04,.71,45,.00025,.00012,1]),
  detect('rotation-90-degrees',[0,-.55,420,.55,0,120,0,0,1])
];
const blank=new Uint8Array(width*height*4).fill(180);
assert.equal(tracker.detect(blank,width,height).found,false,'blank frame must not match');

const session=new SessionTracker(target,scene.tracking),tracking=[];let now=10000;
assert.equal(session.reverifyMs,1500);
const initial=[.65,0,65,0,.65,70,0,0,1];
function follow(name,h,mode){
  const result=session.update(frame(h),width,height,now);now+=80;
  assert(result.found,`${name}: lost (${result.mode}, ${result.matches}/${result.inliers})`);assert.equal(result.mode,mode,name);
  const error=cornerError(result,h);assert(error<10,`${name}: corner error ${error}`);tracking.push({name,mode:result.mode,error});
}
follow('initial',initial,'detect');
for(let i=1;i<=35;i++){
  const a=i*.004,s=.65+i*.0004;
  follow('motion-'+i,[s*Math.cos(a),-s*Math.sin(a),65+i*.7,s*Math.sin(a),s*Math.cos(a),70-i*.3,i*.000002,i*.000001,1],i===19?'detect':'track');
}
assert.equal(session.update(blank,width,height,now).found,false,'target removal must discard tracking');now+=80;
assert.equal(session.update(blank,width,height,now).found,false,'blank reacquisition must not match');now+=80;
follow('reacquire',initial,'detect');

console.log(JSON.stringify({passed:true,targetFeatures:target.points.length,mainModels:Object.fromEntries(Object.entries(mains).map(([key,value])=>[key,{primitives:value.primitives.length}])),effects:effectReport,dragonSkinMsPerFrame,detections,
  session:{frames:tracking.length,trackingFrames:tracking.filter(x=>x.mode==='track').length,maxCornerError:Math.max(...tracking.map(x=>x.error))}},null,2));
