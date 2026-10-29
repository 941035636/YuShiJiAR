const assert=require('node:assert/strict'),fs=require('node:fs');
const glb=require('../pages/ar-native-track/glb.js');
const animation=require('../pages/ar-native-track/animation.js');
const skinning=require('../pages/ar-native-track/skinning.js');
const file=fs.readFileSync('recovery-assets/models/Model/otherModel/zhuque.glb');
function parse(bytes){return glb.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),{effect:true,maxBytes:20*1024*1024});}
const model=parse(file);
assert.equal(model.skins.length,2);assert(model.skins.every(s=>s.joints.length===69));
assert.equal(model.primitives.reduce((n,p)=>n+p.vertices.length/8,0),1856);
assert(model.primitives.some(p=>Array.from(p.skin.weights).some((w,i)=>i%8>=4&&w>0)),'the fifth influence must not be discarded');

// Analytic two-joint case: the second influence is in JOINTS_1/WEIGHTS_1.
const part={vertices:new Float32Array([2,3,4,0,1,0,.25,.75]),skin:{joints:new Uint16Array(8),weights:new Float32Array([.25,0,0,0,.75,0,0,0])}};
part.skin.joints[4]=1;
const fixture={skins:[{joints:[0,1],inverseBindMatrices:new Float32Array([...glb.identity(),...glb.identity()])}]};
fixture.skins[0].inverseBindMatrices[16+12]=-1;
const second=glb.identity();second[12]=9;
const expected=[8,3,4];
const out=skinning.deform(part,skinning.palettes(fixture,[glb.identity(),second])[0]);
assert.deepEqual(Array.from(out.slice(0,3)),expected);
assert.deepEqual(Array.from(out.slice(3)),Array.from(part.vertices.slice(3)),'unlit skinning preserves UVs and remaining vertex attributes');
const reuse=new Float32Array(part.vertices);assert.equal(skinning.deform(part,fixture.skins[0].palette,reuse),reuse);
assert.equal(skinning.palettes(fixture,[glb.identity(),second])[0],fixture.skins[0].palette,'reuse joint palettes');

// Independent oracle: inverse-bind then joint-global, never mesh-node transform.
function transform(m,v,offset=0){return [0,1,2,3].map(r=>m[offset+r]*v[0]+m[offset+4+r]*v[1]+m[offset+8+r]*v[2]+m[offset+12+r]*v[3]);}
let maxError=0,motion=0;
const first=[];
for(const time of [0,.5,1.5,3.5]){
  const worlds=animation.matrices(model,time),palettes=skinning.palettes(model,worlds);
  for(const [pi,p] of model.primitives.entries()){
    const output=skinning.deform(p,palettes[p.skin.index]),skin=model.skins[p.skin.index];
    assert(Array.from(output).every(Number.isFinite));
    if(time===0)first[pi]=output;
    for(let v=0;v<p.vertices.length;v+=8){
      const truth=[0,0,0],position=[...p.vertices.slice(v,v+3),1];
      for(let k=0;k<8;k++){
        const joint=p.skin.joints[v+k],weight=p.skin.weights[v+k];if(!weight)continue;
        const bind=transform(skin.inverseBindMatrices,position,joint*16),world=transform(worlds[skin.joints[joint]],bind);
        for(let axis=0;axis<3;axis++)truth[axis]+=weight*world[axis];
      }
      for(let axis=0;axis<3;axis++){
        maxError=Math.max(maxError,Math.abs(truth[axis]-output[v+axis]));
        motion=Math.max(motion,Math.abs(first[pi][v+axis]-output[v+axis]));
      }
      assert.equal(output[v+6],p.vertices[v+6]);assert.equal(output[v+7],p.vertices[v+7]);
    }
  }
}
assert(maxError<1e-4,'skin matrices match independent joint-space oracle');
assert(motion>.01,'skeletal animation must deform the original mesh');
const t=.7,duration=model.clips[0].duration;
const start=skinning.deform(model.primitives[0],skinning.palettes(model,animation.matrices(model,t))[0]);
const loop=skinning.deform(model.primitives[0],skinning.palettes(model,animation.matrices(model,t+duration))[0]);
assert(start.every((n,i)=>Math.abs(n-loop[i])<1e-5),'authored skin animation loops');
for(const p of model.primitives)model.nodes[p.node].translation=[100,200,300];
const ignoredMeshTransform=skinning.deform(model.primitives[0],skinning.palettes(model,animation.matrices(model,t))[0]);
assert(start.every((n,i)=>Math.abs(n-ignoredMeshTransform[i])<1e-5),'skin must ignore mesh-node transform');

const json=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString()),binStart=28+file.readUInt32LE(12);
function attributeOffset(name){const a=json.accessors[json.meshes[0].primitives[0].attributes[name]];return binStart+(json.bufferViews[a.bufferView].byteOffset||0)+(a.byteOffset||0);}
const badIndex=Buffer.from(file);badIndex.writeUInt16LE(69,attributeOffset('JOINTS_0'));
assert.throws(()=>parse(badIndex),/骨骼索引或权重不合法/);
const badWeight=Buffer.from(file);badWeight.writeFloatLE(-1,attributeOffset('WEIGHTS_0'));
assert.throws(()=>parse(badWeight),/骨骼索引或权重不合法/);
const zeroWeight=Buffer.from(file);for(const name of ['WEIGHTS_0','WEIGHTS_1'])zeroWeight.fill(0,attributeOffset(name),attributeOffset(name)+16);
assert.throws(()=>parse(zeroWeight),/骨骼权重和为零/);
assert.throws(()=>glb.parse(file.buffer.slice(file.byteOffset,file.byteOffset+file.length),{effect:false,maxBytes:20*1024*1024}),/仅支持小型特效骨骼模型/);
console.log(JSON.stringify({passed:true,jointsPerSkin:69,vertices:1856,maxOracleError:maxError,maxAnimatedMotion:motion},null,2));
