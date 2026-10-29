# 进喜鸿蒙原生 AR 独立迁移记录

更新日期：2026-10-29。

## 当前结论

用户已确认自在原生 AR 体验通过真机验证，本轮将自在加入鸿蒙正式业务卡片映射，保留独立入口用于回归。此前本尊、常胜、招财仍使用各自已验收配置。

下一套“进喜”已接入公共引擎，在场景选择页提供「进喜原生 AR 体验」，地址为 `/pages/ar-native-track/index?scene=jin-xi`。模型、识别、四组特效及三路音频已接入，离线、桌面 GPU、页面编译检查通过；尚未上传新体验包，进喜的鸿蒙真机效果和性能待验收。

## 资源与原场景对应

- 识别图：`recovery-assets/cards/xctj.jpg`，复制自原归档 `recovery-assets/textures/Card/xctj.jpg`，882,089 字节，SHA-256 `def030c68c42f5f35b1cb1450d454bf5f4deaa399c2681ce12dfca131bd3b3ec`。
- 目标特征：`pages/ar-native-track/targets/jin-xi.js`，427×640，647 个多尺度 ORB 特征。
- 场景配置：`pages/ar-native-track/scenes/jin-xi.js`。
- 默认金币模型：`Model/GoldModel/xicongtianjiang.glb`，5,187,060 字节，5 个网格。
- 保留墨玉模型：`Model/MoyuModel/xicongtianjiang_moyu.glb`，5,210,964 字节，7 个网格。版本切换控件本轮未恢复。
- 法阵：`FrameAnimation/xctj.glb`，4 个网格、8 条动画通道、37.5 秒，缩放 0.5，位置 `[0,-0.5,0.5]`。
- 朱雀：`Model/otherModel/zhuque.glb`，887,168 字节，2 个网格、2 套各 69 关节的骨骼，合计 1,856 个顶点，191 条动画通道，约 3.9583 秒循环；默认金币布局缩放 1，位置 `[0,-0.5,1]`。
- 文字：`Model/otherModel/xctj_z(3).glb`，4 个网格、10 条动画通道、2.5 秒，缩放 8，位置 `[0,-0.5,0.5]`。
- 环绕：`FrameAnimation/xctjhr.glb`，4 个网格、1 条动画通道、10 秒，缩放 0.4，位置 `[0,-0.5,0.5]`。
- 音频：`Audio/环境音.MP3` 循环、`Audio/喜从天降.mp3` 单次讲解，音量 0.3 / 0.6；`Audio/凤凰.mp3` 单次音效，音量 0.3，延迟 3000 ms。

资源、主次关系和默认金币布局与 `AR/components/xr-ar-JinXi/index.wxml`、`pages/ar/scene-ar-JinXi/index.js` 对照；上述云资源无签名地址的 HTTP 检查全部为 200。原场景朱雀在墨玉分支的缩放为 0.5，后续开放墨玉切换前需分别校准。材质和抗锯齿沿用当前自研基线，未增加 XR-Frame 的 `gz-haixinsha` HDR 环境实现。

## 骨骼动画支持

原解析器明确拒绝骨骼模型，直接替换 URL 会使朱雀加载失败。本轮新增 `skinning.js`，针对小型无光照特效实现 CPU 线性混合蒙皮：

- 读取 `JOINTS_0/1`、`WEIGHTS_0/1` 和逆绑定矩阵，保留第二组权重；朱雀确实存在第五个有效影响，不能只保留前四个权重。
- 从当前 TRS 动画计算关节全局矩阵，乘逆绑定矩阵后变形顶点。输出为资源空间坐标，渲染时只应用场景特效根矩阵，避免再叠加网格节点变换。
- 复用骨骼矩阵、CPU 输出数组和 GPU 动态顶点缓冲；每帧只更新朱雀顶点位置。法线与切线保持原值，适用范围限定于当前无光照特效，不宣称支持受光照角色蒙皮。
- 支持上限：8 套皮肤、每套 128 个关节、单网格 8192 个蒙皮顶点、每文件合计 16384 个蒙皮顶点；不支持 Morph、压缩、归一化整数权重、超过两组权重或带骨骼的主模型。
- 本尊、常胜、招财、自在的普通主模型及 TRS 特效继续使用原绘制路径。

计算约定依据 [Khronos glTF 2.0 的 Skins 规范](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins)，包括只应用关节变换、忽略蒙皮网格节点变换的要求。

## 延迟凤凰音效

`audio.cues` 是可选配置，已有四套场景不设置时保持原两路声音行为。凤凰音效在有效追踪且声音开启累计约三秒后播放一次，按单次体验计数：

- 目标丢失或静音时取消待触发定时器，并保留剩余延时；重新识别或打开声音后继续。
- 已开始但未结束的凤凰音效随识别暂停、恢复；已结束时不因重新识别而重复播放。
- 「重播讲解」只重播《喜从天降》，不重播凤凰音效。
- 停止、重新开始时重置音效状态；退出时销毁三路音频和定时器。
- 播放错误不逐帧重试，重新开启声音可主动重试；相机流中断沿用 500 ms 看门狗暂停机制。

## 实际检查结果

- 离线识别：缩放平移、透视、90°旋转最大角点误差约为 0.90、2.24、4.70 像素；空白帧不命中。
- 连续追踪：39 个有效帧，其中 35 帧使用 LK，最大角点误差约 7.61 像素，包含移动、旋转、倾斜、目标移出与恢复、长间隔和主动重置；进喜继续使用默认 5 秒 ORB 复核周期。
- 骨骼顶点与独立计算核对，最大差值约 `6.15e-7`；覆盖第五权重、逆绑定变换、动画循环、忽略网格节点变换及非法权重/索引拒绝。
- GPU 模拟检查覆盖动态顶点更新、复用缓冲、关闭特效与目标丢失时跳过蒙皮、退出释放资源；已有渲染/材质/音频/抗锯齿回归通过。
- 虚拟时钟检查覆盖三秒音效、丢失/静音期间暂停计时、恢复、结束后不自动重播、重置、失败重试、陈旧回调和退出清理。
- 实际桌面 GPU 使用当前运行时着色器、实际 GLB、1184×1600 画布和 FXAA 绘制检查。[3.25 秒默认金币参考图](../recovery-reports/native-jin-xi-2026-10-29/reference-pbr.png) 可见飞行朱雀；另检查了 6 秒金币/墨玉画面。这是桌面合成视角，不能替代手机验收。

## 真机验收步骤与边界

1. 重新编译并上传体验版，在场景选择页进入「进喜原生 AR 体验」。
2. 扫描 `recovery-assets/cards/xctj.jpg`，检查首次加载、模型贴合、移动、倾斜和旋转。
3. 连续观察数个朱雀飞行循环，检查翅膀变形、飞行范围及与主模型的遮挡关系。原金币布局飞行范围较大，部分阶段会飞出当前镜头，应对比完整循环。
4. 检查法阵、环绕、文字动画；核对识别约三秒后的凤凰音效与讲解、环境音。
5. 在三秒前移开识别图或静音，再恢复；检查音效不会在离开场景后响起。再测停止、重播和前后台恢复。
6. 连续运行至少三分钟，关注新增骨骼计算的帧率、发热和音画表现，确认后再切换进喜正式入口，随后迁移最后的纳福。

当前进喜正式业务卡片在鸿蒙仍提示测试入口，Android/iOS 保留原 XR-Frame；自在已进入鸿蒙正式映射。仍为单目标页面，相似图判别与六图统一扫描尚未实现。用户本轮自在验收未提供新增设备、帧率等细项，不据此补写测试数据。

## 复现

```text
python recovery-tools/prepare-native-target.py --image recovery-assets/cards/xctj.jpg --output-prefix <临时目录>/ysj-native-jin-xi
node recovery-tools/train-native-target.cjs <临时目录>/ysj-native-jin-xi.rgba <临时目录>/ysj-native-jin-xi.json pages/ar-native-track/targets/jin-xi.js
node recovery-tools/test-native-jin-xi.cjs <临时目录>/ysj-native-jin-xi.rgba
node recovery-tools/test-native-skinning.cjs
node recovery-tools/test-native-audio-cues.cjs
node recovery-tools/test-native-model-renderer.cjs
node recovery-tools/test-native-page.cjs
node recovery-tools/test-ar-navigation.cjs
node recovery-tools/export-native-visual-reference.cjs <临时目录>/jin-xi-gpu 2 jin-xi 3.25
python recovery-tools/render-native-visual-reference.py <临时目录>/jin-xi-gpu/reference-pbr.json
```

图像准备需要 Pillow，桌面绘制需要 Pillow/numpy 与 Windows 隐藏 WGL 窗口。导出工具最后一个可选参数是动画采样秒数，省略时仍为六秒。
