# 鸿蒙原生 AR 场景配置化

更新日期：2026-10-30。

## 本阶段目标

在不改变“本尊”已验证识别、姿态、渲染和音频行为的前提下，将单场景实现整理为可复用的公共引擎，为常胜、招财、自在、进喜、纳福五套场景迁移建立稳定入口。

## 已完成

- `pages/ar-native-track/scene-registry.js` 已登记并加载六个业务场景的独立原生配置。
- 新增 `pages/ar-native-track/scenes/ben-zun.js`，集中声明本尊识别目标、主模型、特效、音频、视觉存储键和界面文案。
- 原生页面改为通过 `/pages/ar-native-track/index?scene=ben-zun` 加载场景；没有参数时仍默认本尊，兼容已有入口。
- `ModelRenderer` 改为接收场景模型与特效配置，不再只能读取本尊全局配置。
- `AudioController` 改为接收场景音频地址和音量配置。
- `Preview` 的识别图宽高比由场景目标数据提供，不再固定写死。
- 视觉参数通过 `visual-settings.create(modelConfig, storageKey)` 按场景生成；本尊继续沿用原存储键和已认可默认值。
- Android/iOS 继续进入原 XR-Frame 页面；纯血鸿蒙本尊、常胜、招财、自在与已验收的进喜进入自研页面。纳福保留独立测试入口，未通过真机验收前不加入正式业务分流。
- 可选 `scene.tracking.reverifyMs` 控制周期 ORB 复核；自在和纳福为 1500 ms，其余场景继续默认 5000 ms。该配置不改变公共姿态、绘制或音频逻辑。
- 进喜新增小型无光照骨骼特效支持：解析 JOINTS_0/1、WEIGHTS_0/1 和逆绑定矩阵，CPU 计算朱雀变形后复用动态顶点缓冲。普通 TRS 特效保持原路径。
- `AudioController` 支持可选 `audio.cues` 和 `audio.loops`，分别配置一次性延时音效和各路声音是否循环；未配置场景保持原默认行为。

## 当前目录职责

```text
pages/ar-native-track/
├── scene-registry.js       六场景目录和原生可用状态
├── scenes/
│   ├── ben-zun.js          本尊完整场景配置
│   ├── chang-sheng.js      常胜模型、特效、音频和界面配置
│   ├── zhao-cai.js         招财模型、特效、音频和界面配置
│   ├── zi-zai.js           自在模型、特效、音频和界面配置
│   ├── jin-xi.js           进喜模型、朱雀、特效和音频配置
│   └── na-fu.js            纳福模型、祥龙、特效和音频配置
├── targets/
│   ├── chang-sheng.js      常胜独立离线识别特征
│   ├── zhao-cai.js         招财独立离线识别特征
│   ├── zi-zai.js           自在独立离线识别特征
│   ├── jin-xi.js           进喜独立离线识别特征
│   └── na-fu.js            纳福独立离线识别特征
├── index.js                公共相机、识别调度和页面生命周期
├── session-tracker.js      ORB 首次识别与 LK 连续追踪
├── pose.js                 姿态计算与滤波
├── model-renderer.js       公共 GLB、动画、材质和特效渲染
├── skinning.js             小型无光照特效骨骼变形
├── audio.js                公共识别触发音频生命周期
└── visual-settings.js      按场景生成视觉默认值与校准边界
```

## 增加下一套场景的方法

1. 生成该识别图对应的目标特征文件。
2. 建立该场景的模型、特效、音频和界面配置。
3. 在 `scene-registry.js` 中静态引入配置并将 `nativeReady` 改为 `true`。
4. 在场景选择页增加 `?scene=<scene-key>` 独立体验入口，完成真机校准。
5. 用户确认验收后，再在 `utils/ar-navigation.js` 中增加该场景的鸿蒙正式业务映射。
6. 全部场景通过独立验收后再进入六图自动识别开发，不提前把未验证场景并入统一扫描入口。

## 当前边界

- 常胜、招财、自在与进喜已由用户确认通过真机验证并进入正式平台分流；纳福已完成离线接入但待真机验收。
- 当前仍是单目标识别器，不具备六图自动判别能力。
- 用户已确认本尊画面没有回退、常胜/招财/自在/进喜场景验收通过；纳福需重新上传体验版执行真机验收。
- 相似识别图之间仍可能交叉命中，详见自在迁移记录；单目标页面不代表场景分类器。
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
node recovery-tools/test-native-audio-cues.cjs
node recovery-tools/test-native-skinning.cjs
node recovery-tools/test-native-stabilizer.cjs
node recovery-tools/test-native-antialias.cjs
node recovery-tools/test-native-tracker.cjs <参考图.rgba>
node recovery-tools/test-native-session.cjs <参考图.rgba>
node recovery-tools/test-native-chang-sheng.cjs <常胜参考图.rgba>
node recovery-tools/test-native-zhao-cai.cjs <招财参考图.rgba>
node recovery-tools/test-native-zi-zai.cjs <自在参考图.rgba>
node recovery-tools/test-native-jin-xi.cjs <进喜参考图.rgba>
node recovery-tools/test-native-na-fu.cjs <纳福参考图.rgba>
```
