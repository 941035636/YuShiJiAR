const assert=require('node:assert/strict');
const path=require('node:path');
const modulePath=path.resolve(__dirname,'../utils/ar-navigation.js');
let platform='android',navigations=[],modals=[],toasts=[];
global.wx={
  getDeviceInfo(){return {platform};},
  navigateTo(options){navigations.push(options.url);},
  showModal(options){modals.push(options);},
  showToast(options){toasts.push(options);}
};
delete require.cache[modulePath];
const navigation=require(modulePath);

navigation.openArScene('ben-zun','/pages/ar/scene-ar-BenZun/index');
assert.deepEqual(navigations,['/pages/ar/scene-ar-BenZun/index'],'Android/iOS retain XR-Frame route');

platform='ohos';navigations=[];
navigation.openArScene('ben-zun','/pages/ar/scene-ar-BenZun/index');
assert.deepEqual(navigations,['/pages/ar-native-track/index?scene=ben-zun'],'Harmony ben-zun uses the configured self-developed tracker');

navigations=[];
navigation.openArScene('chang-sheng','/pages/ar/scene-ar-oceanWorld/index');
assert.equal(navigations.length,0,'unmigrated Harmony scene must not enter XR-Frame or a removed plugin');
assert.equal(modals.length,1);assert.match(modals[0].content,/仅“本尊”.*自研 AR/);

const app=require('../app.json');
assert.equal(JSON.stringify(app).includes('plugin'),false,'project manifest must not declare third-party plugins');
assert.equal(app.subpackages.some(item=>item.root==='pages/ar-coar'),false,'removed plugin package must not be registered');
// Formal native entry remains reachable in release and across platforms, without test gates.
let selection;global.Page=value=>selection=value;
require('../pages/selectModel/index.js');
for(const current of ['android','ios','ohos']){
  platform=current;navigations=[];selection.openNativeExperience();
  assert.deepEqual(navigations,['/pages/ar-native-track/index?scene=ben-zun']);
}
assert.equal(selection.openNativeProbe,undefined);assert.equal(selection.openSelfHostedAr,undefined);
assert.deepEqual(app.subpackages.map(item=>item.root),['pages/ar-native-track'],'diagnostic pages are not registered in the formal app');
const fs=require('node:fs'),view=fs.readFileSync('pages/ar-native-track/index.wxml','utf8');
assert.doesNotMatch(view,/toggleDebug|debug-panel|<slider|copyLoadDiagnostics|setQuality|selectVariant/,'formal view must not expose developer controls');
assert.match(view,/bindtap="loadModel"/);assert.match(view,/bindtap="loadEffects"/,'partial loading failure remains recoverable');
console.log('Platform routing and plugin removal checks passed.');
