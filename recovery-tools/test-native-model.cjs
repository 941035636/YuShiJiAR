const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parse}=require('../pages/ar-native-track/glb.js');
const pose=require('../pages/ar-native-track/pose.js');
const config=require('../pages/ar-native-track/model-config.js');
const file=fs.readFileSync('recovery-assets/models/Model/taishanshigandang_yu.glb');
const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
const model=parse(buffer,config);
assert.equal(model.primitives.length,5);
const triangles=model.primitives.reduce((n,p)=>n+p.indices.length/3,0);
assert.equal(triangles,103575);
const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
for(const p of model.primitives){
  assert(p.indices instanceof Uint16Array,'actual model must not require uint32 WebGL extension');
  assert(p.image?.bytes.byteLength>0,'all five existing base-color textures must remain');
  assert.equal(new DataView(p.image.bytes).getUint32(0),0x89504e47,'PNG texture bytes');
  for(let i=0;i<p.vertices.length;i+=8)for(let k=0;k<3;k++){
    bounds.min[k]=Math.min(bounds.min[k],p.vertices[i+k]);bounds.max[k]=Math.max(bounds.max[k],p.vertices[i+k]);
  }
}
assert(Math.abs(bounds.max[1]-bounds.min[1]-config.height)<1e-6,'height normalization');
assert(Math.abs((bounds.min[0]+bounds.max[0])/2-config.centerX)<1e-6,'horizontal center');
assert(Math.abs((bounds.min[1]+bounds.max[1])/2-config.centerY)<1e-6,'vertical center');
assert(bounds.max[2]<1e-6&&bounds.min[2]<-0.1,'model extends out of the printed plane toward camera');
assert.throws(()=>parse(buffer.slice(0,-4),config),/GLB/);
const bad=buffer.slice(0);new DataView(bad).setUint32(0,0,true);assert.throws(()=>parse(bad,config),/GLB/);
function replaceJson(change){
  const n=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+n));change(json);
  const string=Buffer.from(JSON.stringify(json)),length=Math.ceil(string.length/4)*4;
  const out=Buffer.alloc(20+length+file.length-20-n,32);
  file.copy(out,0,0,12);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);out.writeUInt32LE(0x4e4f534a,16);string.copy(out,20);file.copy(out,20+length,20+n);
  return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
assert.throws(()=>parse(replaceJson(j=>j.extensionsRequired=['KHR_draco_mesh_compression']),config),/无压缩/);
assert.throws(()=>parse(replaceJson(j=>j.buffers[0].uri='https://unexpected.invalid/model.bin'),config),/外部/);
assert.throws(()=>parse(replaceJson(j=>j.accessors[1].count=900000),config),/越界/);

// Both real assets must retain their own texture set, tangent basis and plaque geometry.
const goldBytes=fs.readFileSync('recovery-assets/models/Model/GoldModel/taishanshigandang.glb');
const gold=parse(goldBytes.buffer.slice(goldBytes.byteOffset,goldBytes.byteOffset+goldBytes.byteLength),config);
assert.equal(gold.primitives.length,4,'reference asset has no additional jade plaque mesh');
for(const [asset,expectedImages] of [[gold,12],[model,15]]){
  const images=new Set();
  for(const p of asset.primitives){
    assert(p.normalImage&&p.materialImage&&p.occlusionImage,'normal, metallic/roughness and AO maps');
    assert.equal(p.materialImage,p.occlusionImage,'shared ORM bytes must be cached');
    assert.equal(p.metallic,1);assert.equal(p.roughness,1);assert.equal(p.occlusionStrength,1);
    for(const image of [p.image,p.normalImage,p.materialImage,p.occlusionImage])images.add(image.index);
    assert.equal(p.tangents.length,p.vertices.length/8*4);
    for(let i=0;i<p.tangents.length;i+=4){
      const v=i/4*8,n=Array.from(p.vertices.subarray(v+3,v+6)),t=Array.from(p.tangents.subarray(i,i+3));
      assert(t.every(Number.isFinite));assert(Math.hypot(...t)>.1);assert.equal(Math.abs(p.tangents[i+3]),1);
      const cosine=Math.abs(n.reduce((sum,x,k)=>sum+x*t[k],0))/(Math.hypot(...n)*Math.hypot(...t));
      assert(cosine<.002,'transformed normals and tangents remain orthogonal');
    }
  }
  assert.equal(images.size,expectedImages);
}

const width=480,height=640,aspect=427/640,fov=50,f=height/(2*Math.tan(fov*Math.PI/360));
const marker=[[-aspect/2,-.5,0],[aspect/2,-.5,0],[aspect/2,.5,0],[-aspect/2,.5,0]];
let maxPoseError=0;
function cameraPoint(p,angles){
  let [x,y,z]=p;const [a,b,c]=angles;
  [y,z]=[Math.cos(a)*y-Math.sin(a)*z,Math.sin(a)*y+Math.cos(a)*z];
  [x,z]=[Math.cos(b)*x+Math.sin(b)*z,-Math.sin(b)*x+Math.cos(b)*z];
  [x,y]=[Math.cos(c)*x-Math.sin(c)*y,Math.sin(c)*x+Math.cos(c)*y];
  return [x+.03,y-.02,z+1.8];
}
function pixel(p){return {x:f*p[0]/p[2]+width/2,y:f*p[1]/p[2]+height/2};}
const cases=[[0,0,0],[.35,-.28,.1],[-.45,.3,-.2],[.2,.1,Math.PI/2]];
for(const angles of cases){
  const corners=marker.map(p=>pixel(cameraPoint(p,angles)));
  const solved=pose.solve(corners,width,height,aspect,fov);assert(solved,'known calibrated pose');
  assert(solved.error<.01,'marker reprojection');
  // An off-plane point verifies true 3D projection, not just a stretched 2D model picture.
  for(const point of [[0,0,-.15],[.1,-.15,-.1],[-.12,.2,-.05]]){
    const m=solved.mvp,q=[...point,1],clip=[0,0,0,0];
    for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=m[k*4+r]*q[k];
    const actual={x:(clip[0]/clip[3]+1)*width/2,y:(1-clip[1]/clip[3])*height/2};
    const expected=pixel(cameraPoint(point,angles)),error=Math.hypot(actual.x-expected.x,actual.y-expected.y);
    assert(error<.02,`off-plane reprojection ${error}`);maxPoseError=Math.max(maxPoseError,error);
  }
}
const distorted=marker.map(p=>pixel(cameraPoint(p,[.28,-.14,0])));
[[5,-3],[-2,4],[3,2],[-4,-2]].forEach((noise,index)=>{distorted[index].x+=noise[0];distorted[index].y+=noise[1];});
const refined=pose.solve(distorted,width,height,aspect,fov);
assert(refined,'distorted but valid marker pose');
assert(refined.iterations>0,'nonlinear refinement must run');
assert(refined.error<refined.initialError*.85,`refinement should lower reprojection error: ${refined.initialError} -> ${refined.error}`);

function projected(transform,point){
  const clip=[0,0,0,0],q=[...point,1],m=transform.mvp;
  for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=m[k*4+r]*q[k];
  return {x:(clip[0]/clip[3]+1)*width/2,y:(1-clip[1]/clip[3])*height/2};
}
const steady=marker.map(p=>pixel(cameraPoint(p,[.24,-.2,.08]))),filter=new pose.PoseFilter();
let rawPath=0,filteredPath=0,previousRaw,previousFiltered,lastFiltered,lastTime=1000;
for(let frame=0;frame<48;frame++){
  const corners=steady.map((corner,index)=>({
    x:corner.x+Math.sin(frame*1.71+index*2.13)*2.7,
    y:corner.y+Math.cos(frame*1.37+index*1.83)*2.4
  }));
  const raw=pose.solve(corners,width,height,aspect,fov);assert(raw,'noisy pose remains solvable');
  const filtered=filter.update(raw,lastTime+=83),rawPoint=projected(raw,[0,.05,-.2]),filteredPoint=projected(filtered,[0,.05,-.2]);
  if(frame>=8&&previousRaw){rawPath+=Math.hypot(rawPoint.x-previousRaw.x,rawPoint.y-previousRaw.y);filteredPath+=Math.hypot(filteredPoint.x-previousFiltered.x,filteredPoint.y-previousFiltered.y);}
  previousRaw=rawPoint;previousFiltered=filteredPoint;lastFiltered=filteredPoint;
}
assert(filteredPath<rawPath*.72,`pose filter should suppress model jitter: ${rawPath} -> ${filteredPath}`);
const movedCorners=steady.map(corner=>({x:corner.x+36,y:corner.y-8})),movedRaw=pose.solve(movedCorners,width,height,aspect,fov);
const movedFiltered=filter.update(movedRaw,lastTime+83),movedRawPoint=projected(movedRaw,[0,.05,-.2]),movedFilteredPoint=projected(movedFiltered,[0,.05,-.2]);
const requestedMove=Math.hypot(movedRawPoint.x-lastFiltered.x,movedRawPoint.y-lastFiltered.y);
const followedMove=Math.hypot(movedFilteredPoint.x-lastFiltered.x,movedFilteredPoint.y-lastFiltered.y);
assert(followedMove>requestedMove*.75,'adaptive filter must remain responsive during deliberate movement');
filter.reset();const reacquired=filter.update(movedRaw,lastTime+166);
assert.deepEqual(Array.from(reacquired.view),Array.from(movedRaw.view),'reacquisition must not interpolate from the old pose');
const frontal=marker.map(p=>pixel(cameraPoint(p,[0,0,0])));
assert.equal(pose.solve([],width,height,aspect,fov),null);
assert.equal(pose.solve([frontal[0],frontal[3],frontal[2],frontal[1]],width,height,aspect,fov),null,'reflected target');
assert.equal(pose.solve(frontal,width,height,aspect,0),null);
console.log(JSON.stringify({passed:true,primitives:model.primitives.length,triangles,baseColorTextures:5,maxOffPlanePoseError:maxPoseError,poseRefinement:{before:refined.initialError,after:refined.error,iterations:refined.iterations},poseJitter:{rawPath,filteredPath,reduction:1-filteredPath/rawPath},normalizedBounds:bounds},null,2));
