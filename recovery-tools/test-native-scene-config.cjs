const assert=require('node:assert/strict');
const registry=require('../pages/ar-native-track/scene-registry.js');
const visual=require('../pages/ar-native-track/visual-settings.js');

const catalog=registry.getCatalog();
assert.deepEqual(catalog.map(item=>item.key),['ben-zun','chang-sheng','zhao-cai','zi-zai','jin-xi','na-fu']);
assert.equal(catalog.filter(item=>item.nativeReady).length,1);

const scene=registry.requireNative('ben-zun');
assert.equal(scene.name,'本尊');
assert.equal(scene.target.width,427);
assert.equal(scene.target.height,640);
assert.equal(scene.model.variants[scene.model.defaultVariant].label,'原版对照素材');
assert.equal(scene.effects.effects.length,4);
assert.match(decodeURIComponent(scene.audio.sources.narration),/石敢当本当\.mp3$/);
assert.equal(scene.ui.recognitionName,'本尊识别图');

const settings=visual.create(scene.model,scene.visual.storageKey);
assert.equal(settings.storageKey,'ysj-native-visual-v1');
assert.equal(settings.defaults.variantKey,scene.model.defaultVariant);
assert.equal(settings.defaults.fov,scene.model.fov);
assert.throws(()=>registry.requireNative('chang-sheng'),/常胜场景尚未完成鸿蒙原生适配/);
assert.throws(()=>registry.requireNative('unknown'),/未知场景/);

console.log('Native scene catalog, BenZun configuration and unavailable-scene guards passed.');
