# 鸿蒙原生 AR 场景配置化

更新日期：2026-10-29。

## 本阶段目标

在不改变“本尊”已验证识别、姿态、渲染和音频行为的前提下，将单场景实现整理为可复用的公共引擎，为常胜、招财、自在、进喜、纳福五套场景迁移建立稳定入口。

## 已完成

- 新增 `pages/ar-native-track/scene-registry.js`，登记六个业务场景。本尊、常胜、招财已有独立原生配置；自在、进喜、纳福继续被明确拦截，不能误入其他场景配置。
- 新增 `pages/ar-native-track/scenes/ben-zun.js`，集中声明本尊识别目标、主模型、特效、音频、视觉存储键和界面文案。
- 原生页面改为通过 `/pages/ar-native-track/index?scene=ben-zun` 加载场景；没有参数时仍默认本尊，兼容已有入口。
- `ModelRenderer` 改为接收场景模型与特效配置，不再只能读取本尊全局配置。
- `AudioController` 改为接收场景音频地址和音量配置。
- `Preview` 的识别图宽高比由场景目标数据提供，不再固定写死。
- 视觉参数通过 `visual-settings.create(modelConfig, storageKey)` 按场景生成；本尊继续沿用原存储键和已认可默认值。
- Android/iOS 继续进入原 XR-Frame 页面；纯血鸿蒙本尊与已验收的常胜进入自研页面。招财保留独立测试入口，未通过真机验收前不加入正式业务分流；其余三套仍显示“鸿蒙适配中”。

## 当前目录职责

```text
pages/ar-native-track/
├── scene-registry.js       六场景目录和原生可用状态
├── scenes/
│   ├── ben-zun.js          本尊完整场景配置
│   ├── chang-sheng.js      常胜模型、特效、音频和界面配置
│   └── zhao-cai.js         招财模型、特效、音频和界面配置
├── targets/
│   ├── chang-sheng.js      常胜独立离线识别特征
│   └── zhao-cai.js         招财独立离线识别特征
├── index.js                公共相机、识别调度和页面生命周期
├── session-tracker.js      ORB 首次识别与 LK 连续追踪
├── pose.js                 姿态计算与滤波
├── model-renderer.js       公共 GLB、动画、材质和特效渲染
├── audio.js                公共识别触发音频生命周期
└── visual-settings.js      按场景生成视觉默认值与校准边界
```

## 增加下一套场景的方法

1. 生成该识别图对应的目标特征文件。
2. 建立该场景的模型、特效、音频和界面配置。
3. 在 `scene-registry.js` 中静态引入配置并将 `nativeReady` 改为 `true`。
4. 在 `utils/ar-navigation.js` 中增加该场景的鸿蒙原生入口。
5. 保留 `?scene=<scene-key>` 独立体验入口完成真机校准。
6. 通过独立验收后再进入六图自动识别开发，不提前把未验证场景并入统一扫描入口。

## 当前边界

- 常胜已完成纯血鸿蒙真机验收并进入正式平台分流；招财已完成离线接入但待真机验收；自在、进喜、纳福尚未迁移。
- 当前仍是单目标识别器，不具备六图自动判别能力。
- 用户已确认本尊画面没有回退且常胜场景验收通过；招财需重新上传体验版执行真机验收。
- 各场景 GLB、贴图、动画和音频结构不同，迁移时必须分别做资源兼容检查，不能只替换模型 URL。

## 回归命令

```text
node recovery-tools/test-native-scene-config.cjs
node recovery-tools/test-ar-navigation.cjs
node recovery-tools/test-native-page.cjs
node recovery-tools/test-native-model.cjs
node recovery-tools/test-native-model-renderer.cjs
node recovery-tools/test-native-effects.cjs
node recovery-tools/test-native-audio.cjs
node recovery-tools/test-native-stabilizer.cjs
node recovery-tools/test-native-antialias.cjs
node recovery-tools/test-native-tracker.cjs <参考图.rgba>
node recovery-tools/test-native-session.cjs <参考图.rgba>
node recovery-tools/test-native-chang-sheng.cjs <常胜参考图.rgba>
node recovery-tools/test-native-zhao-cai.cjs <招财参考图.rgba>
```
