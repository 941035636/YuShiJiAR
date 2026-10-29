// Exercise page registration with JS-only modules, without Node's JSON loader.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../pages/ar-native-track');
function boot(failedModule, wx = {}, clock = Date, loadOptions) {
  const cache = new Map();
  let definition;
  function load(filename) {
    if (!filename.endsWith('.js')) throw new Error('JS-only module loader: ' + path.basename(filename));
    if (path.basename(filename) === failedModule) throw new Error('Simulated module failure');
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = fs.readFileSync(filename, 'utf8');
    const wrapper = vm.runInContext('(function(require,module,exports){' + source + '\n})', context, { filename });
    wrapper(request => {
      assert(request.startsWith('./')||request.startsWith('../'), 'page dependencies must remain local');
      const resolved=path.resolve(path.dirname(filename),request);
      assert(resolved===root||resolved.startsWith(root+path.sep),'page dependencies must remain inside the native AR package');
      return load(resolved);
    }, module, module.exports);
    return module.exports;
  }
  const context = vm.createContext({
    Page(value) { definition = value; },
    wx, Date: clock, setTimeout, clearTimeout,
    console: { error() {} }
  });
  load(path.join(root, 'index.js'));
  assert(definition, 'page must register before dependencies initialize');
  const page = Object.assign({}, definition, {
    data: { ...definition.data },
    setData(patch) { Object.assign(this.data, patch); }
  });
  page.onLoad(loadOptions);
  return page;
}
const page = boot();
assert(page.tracker, 'local feature data and tracker must initialize');
assert.equal(page.data.sceneKey, 'ben-zun');
assert.equal(page.data.sceneName, '本尊');
assert.equal(page.data.recognitionName, '本尊识别图');
assert.equal(page.tracker.target.width, 427);
assert.equal(page.tracker.target.points.length, 602);
const explicitScene = boot(null, {}, Date, {scene:'ben-zun'});
assert.equal(explicitScene.data.sceneKey, 'ben-zun');
assert.equal(explicitScene.visualSettings.storageKey, 'ysj-native-visual-v1');
explicitScene.onUnload();
const unavailableScene = boot(null, {}, Date, {scene:'chang-sheng'});
assert.equal(unavailableScene.tracker, undefined);
assert.match(unavailableScene.data.status, /常胜场景尚未完成鸿蒙原生适配/);
// Display transforms must preserve camera/model aspect together, and keep one live canvas.
const visual=require('../pages/ar-native-track/visual-settings.js');
for(const [fw,fh,w,h] of [[480,640,375,724],[480,480,430,860],[640,480,844,390]]){
  const full=visual.layout(fw,fh,w,h,false),debug=visual.layout(fw,fh,w,h,true);
  assert(full.canvasWidth>=w&&full.canvasHeight>=h);
  assert(Math.abs(full.canvasWidth/full.canvasHeight-fw/fh)<1e-10,'cover keeps the input aspect');
  assert(Math.abs(full.canvasLeft+full.canvasWidth/2-w/2)<1e-10);
  assert(Math.abs(full.canvasTop+full.canvasHeight/2-h/2)<1e-10);
  assert.equal(debug.canvasWidth,w);assert(Math.abs(debug.canvasTop)<=.5,'debug shows the complete frame');
}
const invalid=visual.sanitize({variantKey:'invalid',modelScale:500,modelOffset:-200,fov:'NaN',exposure:100,effectExposure:-1,renderMode:'other'});
assert.equal(invalid.variantKey,'reference');assert.equal(invalid.modelScale,150);assert.equal(invalid.modelOffset,-25);
assert.equal(invalid.fov,50);assert.equal(invalid.exposure,2);assert.equal(invalid.effectExposure,.5);assert.equal(invalid.renderMode,'pbr');
assert.equal(visual.sanitize({effectExposure:99}).effectExposure,2,'global effect multiplier must stay capped');
let writes=0;
const calibrated=boot(null,{getWindowInfo(){return {windowWidth:390,windowHeight:700};},
  getStorageSync(){return {variantKey:'jade',modelScale:150,renderMode:'simple',quality:'performance',effectExposure:.5};},
  setStorageSync(){writes++;}});
assert.equal(calibrated.data.variantKey,'reference');assert.equal(calibrated.data.modelScale,100);
assert.equal(calibrated.data.renderMode,'pbr');assert.equal(calibrated.data.quality,'balanced');
assert.equal(calibrated.data.effectExposure,visual.defaults.effectExposure,'legacy debug cache must not alter the formal baseline');
assert.equal(calibrated.toggleDebug,undefined);assert.equal(writes,0);
calibrated.preview={showOutline:false,model:{resetTimeline(){}},dispose(){}};
calibrated.refreshViewport();assert.equal(calibrated.preview.quality,'balanced');assert.equal(calibrated.data.stageHeight,700);
calibrated.onUnload();
for (const dependency of ['target.js', 'tracker.js', 'session-tracker.js', 'preview.js']) {
  const failed = boot(dependency);
  assert.equal(failed.data.ready, false);
  assert.match(failed.data.status, /初始化失败.*Simulated module failure/);
  assert.doesNotThrow(() => failed.onReady());
  assert.doesNotThrow(() => failed.start());
  assert.doesNotThrow(() => failed.onUnload());
}
const queryFailure = boot(null, { createSelectorQuery() { throw new Error('Simulated query failure'); } });
assert.doesNotThrow(() => queryFailure.onReady());
assert.match(queryFailure.data.status, /预览初始化失败.*Simulated query failure/);
const missingCanvas = boot(null, {
  createSelectorQuery() { return this; },
  in() { return this; }, select() { return this; }, fields() { return this; },
  exec(callback) { callback([]); }
});
assert.doesNotThrow(() => missingCanvas.onReady());
assert.match(missingCanvas.data.status, /预览初始化失败.*无法获取预览画布/);

// A missing model download must leave the verified camera/outline page usable.
const noModel=boot(null, {
  createSelectorQuery(){return this;},in(){return this;},select(){return this;},fields(){return this;},
  exec(callback){callback([{node:{},width:300}]);},
  downloadFile(options){options.fail({errMsg:'model network unavailable'});return {abort(){}};},
  getFileSystemManager(){return {};}
});
noModel.Preview=function(){this.canvas={};this.gl={};this.dispose=function(){this.model?.dispose();};};
noModel.onReady();assert.equal(noModel.data.ready,true);assert.equal(noModel.data.modelFailed,true);
assert.match(noModel.data.modelStatus,/model network unavailable/);
assert.doesNotThrow(()=>noModel.start());assert.equal(noModel.data.running,true);
noModel.toggleModel();assert.equal(noModel.preview.model.enabled,false);
assert.doesNotThrow(()=>noModel.onUnload());

let copied;
const diagnosticPage=boot(null,{
  getAccountInfoSync(){return {miniProgram:{appId:'wx91ce9cdf4d69aa4d',envVersion:'trial',version:'diagnostic-test'}};},
  createSelectorQuery(){return this;},in(){return this;},select(){return this;},fields(){return this;},
  exec(callback){callback([{node:{},width:300}]);},
  downloadFile(options){options.fail({errMsg:'downloadFile:fail url not in domain list'});return {abort(){}};},
  getFileSystemManager(){return {};},setClipboardData(options){copied=JSON.parse(options.data);options.success();}
});
diagnosticPage.Preview=function(){this.canvas={};this.gl={};this.dispose=function(){this.model?.dispose();};};
diagnosticPage.onReady();diagnosticPage.copyLoadDiagnostics();
assert.equal(copied.appId,'wx91ce9cdf4d69aa4d');assert.equal(copied.envVersion,'trial');
assert.equal(copied.stage,'下载模型');assert.equal(copied.download.httpStatus,null);
assert.match(copied.status,/url not in domain list/);assert.match(copied.download.url,/GoldModel\/taishanshigandang\.glb$/);
assert.equal(copied.visual.variantKey,'reference');assert.equal(copied.visual.renderMode,'pbr');
assert.match(diagnosticPage.data.diagnosticNotice,/已复制/);diagnosticPage.onUnload();

// Search is intentionally less frequent than preview; tracking has no post-compute pause.
let time=0, callback, calls=0, resets=0, draws=[];
const scheduled=boot(null, {
  createCameraContext() { return { onCameraFrame(fn) { callback=fn; return {start(){},stop(){}}; } }; }
}, {now(){return time;}});
scheduled.preview={draw(bytes,w,h,corners){draws.push(corners.length);},dispose(){}};
scheduled.previewWidth=300;
scheduled.tracker={reset(){resets++;},update(){
  calls++;time+=40;
  const found=calls===2;
  return {found,mode:calls===3?'track':'detect',corners:found?[{},{},{},{}]:[],matches:20,inliers:found?16:0,elapsedMs:40};
}};
scheduled.start();scheduled.onCameraReady();
const frame={data:new ArrayBuffer(48*48*4),width:48,height:48};
callback(frame);
assert.equal(calls,1);
for(const tick of [100,200,300]){time=tick;callback(frame);}
assert.equal(calls,2,'descriptor search must be throttled while preview continues');
assert.equal(draws.length,4,'preview must continue between searches');
time=400;callback(frame);assert.equal(calls,3);assert.equal(draws.at(-1),4,'one failed tracking frame is held to suppress flicker');
time=500;callback(frame);assert.equal(calls,4,'schedule must be relative to frame start');
assert.equal(draws.at(-1),0,'continued loss must clear the old outline after the grace period');
const oldCallback=callback;
scheduled.stop();assert(resets>=2);time=600;oldCallback(frame);assert.equal(calls,4);
scheduled.start();scheduled.onCameraReady();oldCallback(frame);assert.equal(calls,4,'old session callback must be ignored');
callback(frame);assert.equal(calls,5);
scheduled.onHide();assert.equal(scheduled.data.running,false);
// Successful audio is gated by the actual 3D preview visibility, including toggles and hide.
let audioTime=0,audioCallback,visible=true;
const audioContexts=[];
const withAudio=boot(null,{
  createCameraContext(){return {onCameraFrame(fn){audioCallback=fn;return {start(){},stop(){}};}};},
  createInnerAudioContext(){const c={plays:0,pauses:0,destroys:0,
    onPlay(){},onEnded(){},onError(){},play(){this.plays++;},pause(){this.pauses++;},stop(){},destroy(){this.destroys++;}};audioContexts.push(c);return c;}
},{now(){return audioTime;}});
withAudio.preview={model:{resetTimeline(){}},draw(bytes,w,h,corners){this.sceneVisible=corners.length===4;},dispose(){}};
withAudio.previewWidth=300;withAudio.tracker={reset(){},update(){return {found:visible,mode:'track',corners:visible?[{},{},{},{}]:[],matches:20,inliers:16,elapsedMs:10};}};
withAudio.start();withAudio.onCameraReady();audioCallback(frame);assert.equal(audioContexts[1].plays,1);
audioTime=100;audioCallback(frame);assert.equal(audioContexts[1].plays,1);
visible=false;audioTime=200;audioCallback(frame);
assert.equal(withAudio.audio.tracked,true,'a single noisy frame must not interrupt audio');
audioTime=400;audioCallback(frame);assert(audioContexts[1].pauses>0,'sustained loss must pause audio');
withAudio.toggleSound();visible=true;audioTime=700;audioCallback(frame);assert.equal(audioContexts[1].plays,1,'muted on reacquisition');
withAudio.toggleSound();assert.equal(audioContexts[1].plays,2);withAudio.onHide();assert.equal(withAudio.audio.tracked,false);
withAudio.onUnload();assert(audioContexts.every(c=>c.destroys===1));
console.log('Native page registration, initialization recovery, independent preview cadence and session cleanup passed.');
