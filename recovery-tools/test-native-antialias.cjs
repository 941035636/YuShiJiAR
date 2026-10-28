// State/coordinate/resource regression; desktop GPU validation is a separate check.
const assert=require('node:assert/strict'),{size}=require('../pages/ar-native-track/render-size'),{Preview}=require('../pages/ar-native-track/preview');
for(const q of ['balanced','high'])for(const [w,h,css,dpr] of [[480,640,570,3],[480,480,900,4],[640,480,844,2],[480,640,300,1]]){
  const r=size(w,h,css,dpr,q,4096);
  assert(Math.abs(r.width/r.height-w/h)<.002);assert(r.width*r.height<=(q==='high'?2404000:1604000));
  assert(Math.max(r.width,r.height)<=(q==='high'?2048:1600));
}
assert.deepEqual(size(480,640,570,3,'performance'),{width:480,height:640});
assert(size(480,640,570,3,'balanced').width>480);
assert(Math.max(...Object.values(size(480,640,570,3,'high',1024)))<=1024);
function fixture(msaa,broken=false){
  let id=0,bound=null,deleted=new Set(),created=new Set(),uploads=[],viewports=[],draws=[],requested,modelInput;
  function allocate(){let value=++id;created.add(value);return value;}
  const gl=new Proxy({
    createShader:allocate,createProgram:allocate,createTexture:allocate,createBuffer:allocate,createRenderbuffer:allocate,createFramebuffer:allocate,
    deleteShader(x){deleted.add(x);},deleteProgram(x){deleted.add(x);},deleteTexture(x){deleted.add(x);},deleteBuffer(x){deleted.add(x);},deleteRenderbuffer(x){deleted.add(x);},deleteFramebuffer(x){deleted.add(x);},
    getShaderParameter(){return true;},getProgramParameter(){return true;},getParameter(){return 4096;},getContextAttributes(){return {antialias:msaa};},
    getAttribLocation(p,n){return n==='uv'?1:0;},getUniformLocation(p,n){return n;},
    checkFramebufferStatus(){return broken?'INCOMPLETE':'FRAMEBUFFER_COMPLETE';},
    bindFramebuffer(k,v){bound=v;},viewport(x,y,w,h){viewports.push([w,h]);},texImage2D(...args){uploads.push(args);},
    drawArrays(){draws.push(bound);}
  },{get(t,k){return k in t?t[k]:/^[A-Z0-9_]+$/.test(k)?k:()=>{};}});
  const canvas={width:0,height:0,getContext(type,options){requested=options;return gl;}};
  const preview=new Preview(canvas);preview.displayWidth=570;preview.pixelRatio=3;preview.showOutline=false;
  const corners=[{x:1,y:2},{x:20,y:2},{x:20,y:30},{x:1,y:30}];
  preview.model={draw(...args){modelInput=args;return {error:2};},dispose(){}};
  preview.draw(new Uint8Array(480*640*4),480,640,corners);
  assert(requested.antialias);assert(canvas.width>480);assert.equal(modelInput[0],corners);assert.equal(modelInput[1],480);assert.equal(modelInput[2],640,'pose stays in source coordinates');
  assert(uploads.some(a=>a[3]===480&&a[4]===640),'camera upload retains source size');
  assert(viewports.every(v=>v[0]===canvas.width&&v[1]===canvas.height));
  assert.equal(bound,null,'presentation must end at default framebuffer');
  if(msaa){assert.equal(preview.aaMode,'系统抗锯齿');assert.equal(preview.filter,undefined);}
  else if(broken){assert.match(preview.aaError,/缓冲不可用/);assert.equal(preview.filter,null);}
  else{assert.equal(preview.aaMode,'FXAA');assert.equal(draws.length,2);assert(draws[0]);assert.equal(draws[1],null,'screen filter presents once');}
  const oldCount=created.size;preview.draw(new Uint8Array(480*640*4),480,640,corners);
  assert.equal(created.size,oldCount,'stable dimensions reuse attachments');
  preview.quality='performance';preview.draw(new Uint8Array(480*640*4),480,640,corners);assert.equal(canvas.width,480);assert.equal(canvas.height,640);
  preview.quality='high';preview.draw(new Uint8Array(480*640*4),480,640,corners);assert(canvas.width>480);
  preview.dispose();assert.equal(created.size,deleted.size,'all GPU resources released after resize, quality switch and fallback');
}
fixture(true);fixture(false);fixture(false,true);
console.log('Independent render resolution, source-space pose, MSAA/FXAA/failure paths, resize reuse and GPU disposal passed.');
