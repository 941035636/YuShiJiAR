# 自在鸿蒙原生 AR 独立迁移记录

更新日期：2026-10-29。

## 当前结论

用户已确认招财通过真机验证，招财正式业务卡片现与本尊、常胜一样，在鸿蒙进入自研 AR，Android/iOS 继续使用原 XR-Frame。

用户现已确认「自在原生 AR 体验」通过真机验证，自在正式业务卡片已加入鸿蒙自研 AR 映射，独立入口保留用于回归。下一套“进喜”已接入独立测试入口，见 [进喜迁移记录](NATIVE-AR-JIN-XI-2026-10-29.md)。

## 资源与配置

- 识别图：`recovery-assets/cards/wszz.jpg`，来自原资源归档 `recovery-assets/textures/Card/wszz.jpg`，863,518 字节，SHA-256 `92f5bf699953bea1bf8beabf55da13d81b935701f355c5b0759da73cfeb79520`。
- 目标特征：`pages/ar-native-track/targets/zi-zai.js`，427×640，622 个多尺度 ORB 特征。
- 场景配置：`pages/ar-native-track/scenes/zi-zai.js`；独立页面地址 `/pages/ar-native-track/index?scene=zi-zai`。
- 默认金币主模型：`Model/GoldModel/wszz.glb`，8,289,232 字节，4 个网格。
- 保留墨玉配置：`Model/wszz_yu.glb`，10,260,424 字节，6 个网格。该场景的墨玉资源不在 `MoyuModel` 子目录。
- 法阵：`FrameAnimation/dcdy02 (2).glb`，4 个网格、8 条动画通道、37.5 秒。
- 龟图腾：`FrameAnimation/gui.glb`，2 个网格、4 条动画通道、37.5 秒。
- 环绕：`FrameAnimation/wszzhr.glb`，4 个网格、1 条动画通道、10 秒。
- 音频：`Audio/环境音.MP3` 与 `Audio/无事自在.mp3`，音量沿用 0.3 / 0.6。

上述路径均相对现有腾讯云 `AR-YSJ/` 根目录，无签名地址 HTTP 检查全部为 200。主模型、特效、讲解与原 `AR/components/xr-ar-ZiZai/index.wxml`、`pages/ar/scene-ar-ZiZai/index.js` 对应；环绕保留原布局的 Z=0.4。未改动已认可的增强材质、绘制分辨率、抗锯齿及音频生命周期。

## 已完成验证

- 两个主模型及三组动画均可被现有 GLB 解析器读取，主模型为 WebGL 1 可用的 16 位索引与内嵌贴图。
- 离线识别：缩放平移、透视和 90°旋转的最大角点误差分别约 2.08、3.27、3.21 像素；空白帧不命中。
- 连续追踪：39 个有效帧，其中 34 帧使用 LK，覆盖移动、倾斜、旋转、移出后恢复、长间隔及主动重置，最大角点误差约 5.79 像素。
- 自在原先沿用 5 秒 ORB 复核时，合成连续移动第 33 帧误差达到 10.45 像素。因此新增可选的场景追踪参数，自在设置 `tracking.reverifyMs=1500`；本尊、常胜、招财仍沿用默认 5000 ms。该调整的手机耗时和帧率需真机确认。
- 场景注册、页面初始化、招财正式路由、自在测试路由及 Android/iOS 原路径回归通过；公共渲染、特效、音频、姿态和抗锯齿回归通过。
- 用实际 GLB、当前运行时着色器、6 秒动画姿态，完成金币及墨玉的桌面 GPU 绘制检查，1184×1600 并启用 FXAA。[默认金币参考图](../recovery-reports/native-zi-zai-2026-10-29/reference-pbr.png) 为桌面合成视角，不代表手机效果或帧率。

## 当前边界

- 自在真机验收依据为用户本轮确认，未补写具体设备和帧率数据；进喜待真机验收，纳福尚未迁移。
- 仍是每个页面加载一个目标，不具备六图自动识别能力。本轮额外对照发现，本尊与自在的相似特征可使自在检测器在本尊图上命中（21 个内点）；不能将当前单目标检测当作场景分类器，统一扫描开发时需加入相似图判别。
- 金币／墨玉切换控件尚未恢复，独立入口默认金币配置。墨玉桌面参考中的法阵和图腾比例较大，开放墨玉切换前还需单独校准特效对齐。
- 招财验收依据为用户本轮确认，未据此补写具体设备、帧率或长时间测试数据。

## 真机操作

1. 微信开发者工具重新编译并上传体验版。
2. 场景选择页进入「自在原生 AR 体验」，扫描 `recovery-assets/cards/wszz.jpg`。
3. 检查模型方向、大小、贴合与倾斜，移开后重新扫描。
4. 检查法阵、龟图腾、环绕和动画循环，以及环境音、讲解、静音、重播和前后台恢复。
5. 持续运行至少三分钟，关注定期识别时是否卡顿；确认后将 `zi-zai` 加入鸿蒙正式业务映射，再迁移进喜。

## 复现命令

```text
python recovery-tools/prepare-native-target.py --image recovery-assets/cards/wszz.jpg --output-prefix <临时目录>/ysj-native-zi-zai
node recovery-tools/train-native-target.cjs <临时目录>/ysj-native-zi-zai.rgba <临时目录>/ysj-native-zi-zai.json pages/ar-native-track/targets/zi-zai.js
node recovery-tools/test-native-zi-zai.cjs <临时目录>/ysj-native-zi-zai.rgba
node recovery-tools/test-native-scene-config.cjs
node recovery-tools/test-ar-navigation.cjs
node recovery-tools/test-native-page.cjs
node recovery-tools/export-native-visual-reference.cjs <临时目录>/zi-zai-gpu 2 zi-zai
python recovery-tools/render-native-visual-reference.py <临时目录>/zi-zai-gpu/reference-pbr.json <临时目录>/zi-zai-gpu/jade-pbr.json
```

Python 图像准备和桌面绘制分别需要 Pillow、Pillow/numpy，桌面绘制脚本仅在 Windows 使用隐藏 WGL 窗口。
