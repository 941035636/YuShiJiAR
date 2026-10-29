# 常胜鸿蒙原生 AR 独立迁移记录

更新日期：2026-10-29。

## 本阶段结论

“常胜”已在不复制、不重写底层算法的前提下接入现有鸿蒙原生 AR 公共引擎，并由用户确认真机验收通过。Android/iOS 继续使用原 XR-Frame 页面；鸿蒙原“常胜”业务卡片现已切换到原生场景，独立入口继续保留用于回归。

## 已实际验证

- 原识别图 `qkds.jpg` 已从本项目腾讯云存储取回，HTTP 200，大小 884,277 字节，SHA-256 为 `9999b6b7f358120d391e2ae99f05dc364f03d7290ac22a3e2e7ba688f8d9bdf3`。
- 识别图按 427×640 生成 678 个多尺度 ORB 特征，写入 `pages/ar-native-track/targets/chang-sheng.js`，没有覆盖本尊 `target.js`。
- 金币主模型 `qikaidesheng_jinbi.glb` 可被现有 GLB 加载器解析，含 10 个渲染网格。
- 墨玉主模型 `qikaidesheng_moyu.glb` 可被现有 GLB 加载器解析，含 11 个渲染网格。
- `qkds01.glb` 含 4 个网格、8 条动画通道、37.5 秒动画。
- `scene.glb` 含 2 个网格、4 条动画通道、37.5 秒动画。
- `qkdshr.glb` 含 4 个网格、1 条动画通道、10 秒动画。
- 三组特效均能通过公共动画矩阵和场景对齐矩阵计算；两套主模型均保持 WebGL 1 可用的 16 位索引和内嵌贴图。
- 离线合成图测试覆盖缩放平移、透视和 90°旋转，最大角点误差分别为 1.51 px、1.96 px、2.84 px；空白帧未误识别。
- 环境音与《旗开得胜》讲解的无签名腾讯云地址均返回 HTTP 200。
- 场景注册、页面初始化、平台路由和本尊既有测试通过。

## 真机验收结果

- 默认展示金币版主模型，并保留墨玉版模型配置。
- 沿用原 XR-Frame 位置和缩放关系接入常胜法阵、背景和环绕特效；用户已确认该场景验收通过。
- 识别成功后循环播放环境音、单次播放《旗开得胜》讲解，沿用公共丢失暂停、重新识别恢复逻辑。
- 场景选择页的“常胜原生 AR 体验”可直接进入 `/pages/ar-native-track/index?scene=chang-sheng`。

## 验收后切换

- `utils/ar-navigation.js` 已增加常胜鸿蒙正式映射；鸿蒙点击原“常胜”业务卡片会进入 `/pages/ar-native-track/index?scene=chang-sheng`。
- Android/iOS 继续使用 `pages/ar/scene-ar-oceanWorld/index`，没有修改旧场景行为。
- 尚未并入六图自动识别；当前体验页一次只加载常胜识别目标。
- 尚未完成金币/墨玉版的正式用户切换控件。

## 真机验收重点

1. 打开场景选择页，点击“常胜原生 AR 体验”。
2. 用 `recovery-assets/cards/qkds.jpg` 原图或清晰打印图验证首次识别、移动、倾斜、90°旋转和移出后恢复。
3. 核对金币主模型与识别图中摆件的中心、大小、前后关系和抖动情况。
4. 核对法阵、背景、环绕特效是否完整，尤其是 37.5 秒循环结束处是否跳帧。
5. 核对环境音、讲解、关闭声音、重播讲解、切后台和停止体验的生命周期。
6. 连续运行至少三分钟，记录画面帧率、定位帧率、姿态误差、加载失败提示和设备/微信版本。

## 回归命令

```text
node recovery-tools/test-native-scene-config.cjs
node recovery-tools/test-ar-navigation.cjs
node recovery-tools/test-native-page.cjs
node recovery-tools/test-native-chang-sheng.cjs <常胜参考图.rgba>
```
