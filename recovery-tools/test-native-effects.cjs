const assert=require('node:assert/strict'),fs=require('node:fs');
const glb=require('../pages/ar-native-track/glb.js');
const animation=require('../pages/ar-native-track/animation.js');
const config=require('../pages/ar-native-track/model-config.js');
const definitions=require('../pages/ar-native-track/effects-config.js').effects;
const {effectRoot}=require('../pages/ar-native-track/model-renderer.js');
function read(path,effect){const b=fs.readFileSync(path);return glb.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{...config,effect});}
const main=read('recovery-assets/models/Model/taishanshigandang_yu.glb',false),assets={};
const report=[];
for(const def of definitions){
  assert(Number.isFinite(def.exposure)&&def.exposure>=.4&&def.exposure<=2,'each effect needs an explicit safe exposure');
  const file=def.key==='sgd'?'Model/otherModel/sgd':'FrameAnimation/'+def.key;
  const model=read('recovery-assets/models/'+file+'.glb',true);assets[def.key]=model;
  const original=JSON.stringify(model.nodes);
  const root=effectRoot(main.alignment,def);
  for(const time of [0,.5,2.5,6,12.5,37.5]){
    const matrices=animation.matrices(model,time);
    for(const part of model.primitives){assert(matrices[part.node]);assert([...matrices[part.node],...root].every(Number.isFinite));}
  }
  assert.equal(JSON.stringify(model.nodes),original,'sampling must not overwrite source node transforms');
  if(def.key!=='sgd'){
    assert(model.primitives.every(p=>p.transparent&&p.doubleSided));
    assert(model.primitives.every(p=>p.image&&p.wrapS===10497&&p.wrapT===10497));
    const duration=model.clips[0].duration,a=animation.matrices(model,0),b=animation.matrices(model,duration);
    for(const part of model.primitives)assert.deepEqual(a[part.node],b[part.node],'clip must loop');
  }
  report.push({key:def.key,primitives:model.primitives.length,channels:model.clips[0]?.channels.length||0,duration:model.clips[0]?.duration||0});
}
assert(definitions.find(value=>value.key==='sgd').exposure<definitions.find(value=>value.key==='dcdy02').exposure,'text must remain below the magic circle exposure');
assert.equal(assets.dun.clips[0].duration,10);
assert.equal(assets.shan.clips[0].duration,37.5);
assert.equal(assets.dcdy02.clips[0].duration,37.5);
assert.equal(assets.dcdy02.clips[0].channels.length,8);
const start=animation.matrices(assets.shan,0)[0],grown=animation.matrices(assets.shan,6)[0];
assert(Math.abs(start[0])<.001&&Math.abs(grown[0])>.5,'mountain must use authored scale animation');
const at0=animation.matrices(assets.dun,0)[0],at2=animation.matrices(assets.dun,2.5)[0];
assert(Math.abs(at0[6]-1)<1e-5,'animated TRS replaces default rotation at t=0');
assert(at0.some((x,i)=>Math.abs(x-at2[i])>.1),'shield must actually rotate');
const rotation={path:'rotation',size:4,times:new Float32Array([0,1]),values:new Float32Array([0,0,0,1,0,1,0,0]),interpolation:'LINEAR'};
const halfway=animation.sample(rotation,.5);
assert(Math.abs(halfway[1]-Math.SQRT1_2)<1e-6&&Math.abs(halfway[3]-Math.SQRT1_2)<1e-6,'quaternion slerp');
assert.deepEqual(animation.sample({...rotation,interpolation:'STEP'},.5),[0,0,0,1]);
const antipodal={...rotation,values:new Float32Array([0,0,0,1,0,0,0,-1])};
assert.deepEqual(animation.sample(antipodal,.5),[0,0,0,1],'short quaternion path');
const clock=new animation.Clock();assert.equal(clock.time(true,1000),0);assert.equal(clock.time(true,1100),.1);
assert.equal(clock.time(false,1200),.2);assert.equal(clock.time(false,9000),.2);assert.equal(clock.time(true,9100),.2);
assert.equal(clock.time(true,9200),.3);clock.reset();assert.equal(clock.time(true,10000),0);
console.log(JSON.stringify({passed:true,assets:report},null,2));
