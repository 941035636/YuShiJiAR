# 纳福鸿蒙原生 AR 独立迁移记录

更新日期：2026-10-30。

## 当前结论

用户已确认进喜通过纯血鸿蒙真机测试，本轮将进喜加入鸿蒙正式业务分流，Android/iOS 继续使用原 XR-Frame 页面，独立入口继续保留用于回归。

最后一套“纳福”已复用公共引擎完成第一轮接入，包含识别目标、金币/墨玉主模型、祥龙骨骼动画、法阵、环绕、文字和三路音频。场景选择页提供「纳福原生 AR 体验」，地址为 `/pages/ar-native-track/index?scene=na-fu`；正式鸿蒙业务卡片仍保持测试提示，真机验收后再切换。

## 资源与原场景对应

- 识别图：`recovery-assets/cards/syjd.jpg`，848,257 字节，SHA-256 `40d4492f71fcc4822674ecc93e319e207bd4676c5f31ee7f1c774fff642845e6`。
- 目标特征：`pages/ar-native-track/targets/na-fu.js`，427×640，573 个多尺度 ORB 特征。
- 场景配置：`pages/ar-native-track/scenes/na-fu.js`。
- 默认金币模型：`Model/GoldModel/SYJD.glb`，10,290,336 字节，4 个网格。
- 保留墨玉模型：`Model/MoyuModel/SYJD_moyu.glb`，10,173,452 字节，6 个网格。
- 祥龙：`Model/otherModel/long.glb`，2,411,376 字节，1 个 11,006 顶点骨骼网格、52 根骨骼、135 条动画通道、约 3.3333 秒循环；缩放 3，位置 `[0,-1,5]`。
- 法阵：`FrameAnimation/syjd.glb`，4 个网格、8 条动画通道、37.5 秒，缩放 0.5，位置 `[0,-0.5,0.5]`。
- 环绕：`FrameAnimation/syjdhr.glb`，4 个网格、1 条动画通道、10 秒，缩放 0.4，位置 `[0,-0.5,0.5]`。
- 文字：`Model/otherModel/syjd.glb`，1 个网格、1 条动画通道、37.5 秒，缩放 0.1，位置 `[0,-0.5,-0.3]`。
- 音频：`环境音.MP3` 单次、`所愿皆得.mp3` 单次讲解，音量 0.3 / 0.6；`龙的音效.MP3` 单次音效，音量 0.4，在有效追踪累计 3000 ms 后播放。

上述无签名腾讯云地址均返回 HTTP 200。模型、布局、音量和延时依据 `AR/components/xr-ar-NaFu/index.wxml` 与 `pages/ar/scene-ar-NaFu/index.js`；没有伪造或替换素材。

## 针对纳福的兼容处理

- 祥龙结构合法，但单网格 11,006 顶点超过朱雀使用的默认 8,192 顶点安全上限。解析器默认上限保持不变，只允许场景配置在 16,384 硬上限内显式提高；纳福设置为 12,000，其他场景保护范围不变。
- 祥龙继续使用现有 CPU 蒙皮和动态 GPU 顶点缓冲，没有新增另一套渲染算法。桌面 20 次采样的平均蒙皮计算约 0.65 ms/帧，仅用于回归对比，不能代替鸿蒙手机性能数据。
- 纳福白底识别图在持续移动时更容易积累 LK 漂移，因此像自在一样设置 1500 ms 周期 ORB 复核；公共追踪算法没有修改。
- 音频控制器增加可选 `audio.loops`。未配置场景仍保持环境音循环；纳福显式设置环境音不循环，符合原页面行为。
- 龙音效复用进喜已验证的延时音效机制；丢失、静音、停止和退出会暂停或清理计时与音频。

## 实际检查结果

- 离线识别：缩放平移、透视、90°旋转最大角点误差约 1.03、1.22、4.38 px；空白帧不命中。
- 连续追踪：37 个有效帧，其中 34 帧使用 LK，包含 1500 ms 周期复核、目标移出与恢复；最大角点误差约 5.79 px。
- 金币/墨玉模型、四组特效、祥龙骨骼变形、场景矩阵和音频配置通过离线测试。
- 页面注册、六场景配置、平台路由、延时音效、环境音单次播放、骨骼安全限制和既有场景回归通过。
- Windows 隐藏 GPU 使用实际运行时着色器、GLB、1184×1600 画布和 FXAA 成功渲染。[1 秒金币参考图](../recovery-reports/native-na-fu-2026-10-30/reference-pbr.png) 显示主模型、法阵、环绕、文字和飞行祥龙。这是合成视角，不替代手机验收。

## 真机验收步骤与边界

1. 重新编译并上传体验版，从场景选择页进入「纳福原生 AR 体验」。
2. 扫描 `recovery-assets/cards/syjd.jpg`，检查首次识别、移动、倾斜、旋转、移出与重新识别。
3. 连续观察多个 3.33 秒祥龙循环；原布局的龙飞行范围很大，某些阶段会位于镜头边缘，需按完整循环判断，不只看单帧。
4. 检查法阵、环绕和“所愿皆得”文字层级、透明度及与主模型的遮挡关系。
5. 检查环境音只播放一次、《所愿皆得》讲解、三秒龙音效、静音、重播讲解、停止和前后台生命周期。
6. 连续运行至少三分钟，重点记录祥龙骨骼动画下的帧率、发热和模型贴合；确认后再将纳福加入正式业务映射。

当前仍是每个业务卡片进入各自单目标页面，并非六图统一自动判别。纳福通过后，六套独立场景迁移即完成，下一阶段才是多目标自动识别与统一入口。

## 复现

```text
python recovery-tools/prepare-native-target.py --image recovery-assets/cards/syjd.jpg --output-prefix <临时目录>/ysj-native-na-fu
node recovery-tools/train-native-target.cjs <临时目录>/ysj-native-na-fu.rgba <临时目录>/ysj-native-na-fu.json pages/ar-native-track/targets/na-fu.js
node recovery-tools/test-native-na-fu.cjs <临时目录>/ysj-native-na-fu.rgba
node recovery-tools/test-native-skinning.cjs
node recovery-tools/test-native-audio-cues.cjs
node recovery-tools/test-native-model-renderer.cjs
node recovery-tools/test-native-page.cjs
node recovery-tools/test-ar-navigation.cjs
node recovery-tools/export-native-visual-reference.cjs <临时目录>/na-fu-gpu 2 na-fu 1
python recovery-tools/render-native-visual-reference.py <临时目录>/na-fu-gpu/reference-pbr.json
```
