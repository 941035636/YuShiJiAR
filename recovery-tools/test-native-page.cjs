// Exercise page registration with JS-only modules, without Node's JSON loader.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../pages/ar-native-track');
function boot(failedModule, wx = {}, clock = Date) {
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
      assert(request.startsWith('./'), 'page dependencies must remain local');
      return load(path.resolve(path.dirname(filename), request));
    }, module, module.exports);
    return module.exports;
  }
  const context = vm.createContext({
    Page(value) { definition = value; },
    wx, Date: clock,
    console: { error() {} }
  });
  load(path.join(root, 'index.js'));
  assert(definition, 'page must register before dependencies initialize');
  const page = Object.assign({}, definition, {
    data: { ...definition.data },
    setData(patch) { Object.assign(this.data, patch); }
  });
  page.onLoad();
  return page;
}
const page = boot();
assert(page.tracker, 'local feature data and tracker must initialize');
assert.equal(page.tracker.target.width, 427);
assert.equal(page.tracker.target.points.length, 602);
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
assert.equal(calls,1,'search must stay throttled');
assert.equal(draws.length,4,'preview must continue between searches');
time=400;callback(frame);assert.equal(calls,2);assert.equal(draws.at(-1),4);
time=500;callback(frame);assert.equal(calls,3,'schedule must be relative to frame start');
assert.equal(draws.at(-1),0,'failed tracking must clear old outline immediately');
const oldCallback=callback;
scheduled.stop();assert(resets>=2);time=600;oldCallback(frame);assert.equal(calls,3);
scheduled.start();scheduled.onCameraReady();oldCallback(frame);assert.equal(calls,3,'old session callback must be ignored');
callback(frame);assert.equal(calls,4);
scheduled.onHide();assert.equal(scheduled.data.running,false);
console.log('Native page registration, initialization recovery, independent preview cadence and session cleanup passed.');
