// Exercise page registration with JS-only modules, without Node's JSON loader.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../pages/ar-native-track');
function boot(failedModule, wx = {}) {
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
    wx,
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
for (const dependency of ['target.js', 'tracker.js', 'preview.js']) {
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
console.log('Native page registration, JS-only dependency loading and initialization failure recovery passed.');
