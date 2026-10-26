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
assert.throws(()=>parse(replaceJson(j=>j.extensionsRequired=['KHR_draco_mesh_compression']),config),/静态/);
assert.throws(()=>parse(replaceJson(j=>j.buffers[0].uri='https://unexpected.invalid/model.bin'),config),/外部/);
assert.throws(()=>parse(replaceJson(j=>j.accessors[1].count=900000),config),/越界/);

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
const frontal=marker.map(p=>pixel(cameraPoint(p,[0,0,0])));
assert.equal(pose.solve([],width,height,aspect,fov),null);
assert.equal(pose.solve([frontal[0],frontal[3],frontal[2],frontal[1]],width,height,aspect,fov),null,'reflected target');
assert.equal(pose.solve(frontal,width,height,aspect,0),null);
console.log(JSON.stringify({passed:true,primitives:model.primitives.length,triangles,baseColorTextures:5,maxOffPlanePoseError:maxPoseError,normalizedBounds:bounds},null,2));
