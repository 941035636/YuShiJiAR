// Mock GPU tests verify state/lifecycle only; they do not claim real shader/device compatibility.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {ModelRenderer}=require('../pages/ar-native-track/model-renderer.js');
const {Preview}=require('../pages/ar-native-track/preview.js');
const {parse}=require('../pages/ar-native-track/glb.js');
const config=require('../pages/ar-native-track/model-config.js');
const input=fs.readFileSync('recovery-assets/models/Model/taishanshigandang_yu.glb');
const buffer=input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength);
const source=parse(buffer,config);
let sequence=0,draws=[],created=new Set(),deleted=new Set(),files=new Set(),unlinked=[],readCount=0,aborted=0,download;
let depthWrite=false,blend=false,local=[];
function allocate(){const id=++sequence;created.add(id);return id;}
const gl=new Proxy({
  createBuffer:allocate,createTexture:allocate,createProgram:allocate,createShader:allocate,
  deleteBuffer(id){deleted.add(id);},deleteTexture(id){deleted.add(id);},deleteProgram(id){deleted.add(id);},deleteShader(id){deleted.add(id);},
  getShaderParameter(){return true;},getProgramParameter(){return true;},getError(){return 'NO_ERROR';},
  getParameter(name){return name==='MAX_TEXTURE_SIZE'?4096:16;},
  getAttribLocation(program,name){return {p:0,position:0,normal:1,uv:2}[name];},getUniformLocation(program,name){return name;},
  depthMask(value){depthWrite=value;},enable(name){if(name==='BLEND')blend=true;},disable(name){if(name==='BLEND')blend=false;},
  uniformMatrix4fv(name,transpose,value){if(name==='local')local=Array.from(value);},
  drawElements(mode,count){draws.push({kind:'model',count,depthWrite,blend,local});},drawArrays(mode){draws.push({kind:mode});}
},{get(target,key){if(key in target)return target[key];return /^[A-Z0-9_]+$/.test(key)?key:function(){};}});
const canvas={width:480,height:640,getContext(){return gl;},createImage(){
  return {width:256,height:256,set src(value){queueMicrotask(()=>this.onload?.());}};
}};
const filesystem={
  writeFile(options){files.add(options.filePath);queueMicrotask(()=>options.success());},
  unlink(options){unlinked.push(options.filePath);files.delete(options.filePath);options.complete?.();},
  readFile(options){readCount++;queueMicrotask(()=>options.success({data:buffer}));}
};
global.wx={env:{USER_DATA_PATH:'wxfile://test'},getFileSystemManager(){return filesystem;},downloadFile(options){download=options;return {abort(){aborted++;},onProgressUpdate(){}};}};
async function main(){
  const states=[],model=new ModelRenderer(canvas,gl,(text,failed,detail)=>states.push({text,failed,detail}));
  await model.build(source);model.ready=true;
  assert.equal(model.parts.length,5);assert.equal(files.size,0);assert.equal(unlinked.length,5);
  assert.equal(model.draw([],480,640,427/640),null);assert.equal(draws.length,0);
  const f=640/(2*Math.tan(50*Math.PI/360)),aspect=427/640;
  const corners=[[-aspect/2,-.5],[aspect/2,-.5],[aspect/2,.5],[-aspect/2,.5]].map(p=>({x:240+f*p[0]/1.8,y:320+f*p[1]/1.8}));
  assert(model.draw(corners,480,640,aspect));assert.equal(draws.filter(d=>d.kind==='model').length,5);
  model.enabled=false;const count=draws.length;model.draw(corners,480,640,aspect);assert.equal(draws.length,count);
  model.enabled=true;
  const preview=new Preview(canvas);preview.model=model;
  draws=[];preview.draw(new Uint8Array(480*640*4),480,640,corners);
  assert.equal(draws.filter(d=>d.kind==='model').length,5,'five 3D mesh draws');
  assert(draws.some(d=>d.kind==='LINE_LOOP'),'outline remains visible');
  draws=[];preview.draw(new Uint8Array(480*640*4),480,640,[]);
  assert.equal(draws.filter(d=>d.kind==='model').length,0,'target loss hides model');
  function effect(def){const file=def.key==='sgd'?'Model/otherModel/sgd':'FrameAnimation/'+def.key;
    const bytes=fs.readFileSync('recovery-assets/models/'+file+'.glb');return parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{...config,effect:true});}
  const effectsStates=[];model.readEffect=async def=>effect(def);
  await model.loadEffects((text,failed)=>effectsStates.push({text,failed}));
  assert.equal(model.parts.length,12);assert.equal(model.effectGroups.length,4);assert.equal(effectsStates.at(-1).failed,false);
  model.clock.reset();draws=[];preview.draw(new Uint8Array(480*640*4),480,640,corners);
  assert.equal(draws.filter(d=>d.kind==='model').length,12,'all effects and main model');
  const transparent=draws.filter(d=>d.kind==='model'&&d.blend);
  assert.equal(transparent.length,6);assert(transparent.every(d=>!d.depthWrite),'transparent effects must not write depth');
  assert(draws.filter(d=>d.kind==='model'&&!d.blend).every(d=>d.depthWrite),'opaque main and text write depth');
  const shieldStart=draws.find(d=>d.count===18).local;
  model.clock.elapsed=2500;model.clock.at=null;model.clock.active=false;
  draws=[];preview.draw(new Uint8Array(480*640*4),480,640,corners);
  assert(draws.find(d=>d.count===18).local.some((x,i)=>Math.abs(x-shieldStart[i])>.01),'animated local matrix reaches GPU');
  model.effectsEnabled=false;draws=[];preview.draw(new Uint8Array(480*640*4),480,640,corners);
  assert.equal(draws.filter(d=>d.kind==='model').length,5,'effect toggle preserves body');model.effectsEnabled=true;
  model.readEffect=async def=>{if(def.key==='shan')throw new Error('simulated effect failure');return effect(def);};
  await model.loadEffects((text,failed)=>effectsStates.push({text,failed}));
  assert.equal(model.effectGroups.length,3);assert.equal(effectsStates.at(-1).failed,true);assert(model.ready,'effect failure must preserve body');
  preview.dispose();assert.equal(created.size,deleted.size,'all GPU resources released');

  const cancelled=new ModelRenderer(canvas,gl,()=>{});cancelled.load();const oldDownload=download;
  cancelled.dispose();oldDownload.success({statusCode:200,tempFilePath:'old.glb'});
  assert.equal(aborted,1);assert.equal(readCount,0,'download callback must not access closed page');

  const loading=new ModelRenderer(canvas,gl,(text,failed)=>states.push({text,failed}));
  loading.load();download.success({statusCode:403,tempFilePath:'denied.glb'});
  assert(states.at(-1).failed);assert.equal(readCount,0);loading.dispose();

  const blocked=new ModelRenderer(canvas,gl,(text,failed,detail)=>states.push({text,failed,detail}));
  blocked.load();download.fail({errMsg:'downloadFile:fail url not in domain list'});
  assert.equal(states.at(-1).detail.stage,'下载模型');assert.equal(states.at(-1).detail.httpStatus,null);
  assert.match(states.at(-1).text,/url not in domain list/);assert.equal(readCount,0,'blocked domain must not reach file parsing');blocked.dispose();

  const broken=new ModelRenderer(canvas,gl,()=>{});
  const write=filesystem.writeFile;
  filesystem.writeFile=options=>options.fail({errMsg:'storage unavailable'});
  await assert.rejects(broken.build(source),/storage unavailable/);broken.dispose();filesystem.writeFile=write;
  assert.equal(files.size,0);assert.equal(created.size,deleted.size);

  let finishWrite;
  filesystem.writeFile=options=>{files.add(options.filePath);finishWrite=options.success;};
  const pending=new ModelRenderer(canvas,gl,()=>{}),job=pending.build(source);
  await Promise.resolve();assert(finishWrite);pending.dispose();finishWrite();
  await assert.rejects(job,/页面已关闭/);assert.equal(files.size,0);assert.equal(created.size,deleted.size);
  console.log('Model/effect GPU lifecycle, animated matrices, alpha/depth state, visibility, partial failure and cancelled callbacks passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
