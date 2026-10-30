# 泰山老奶奶“碧霞显圣”独立 AR 场景

## 本次范围

- 在原 `YuShiJiAR` 工程中新增独立入口：`/pages/ar-native-track/index?scene=bixia-yuanjun`。
- 复用现有 `camera/onCameraFrame + ORB/LK + 姿态滤波 + WebGL/GLB` 自研链路。
- 不修改本尊、常胜、招财、自在、进喜、纳福的场景配置，不加入自动六图识别，也不改变 Android/iOS 的 XR-Frame 路由。
- 新增视觉主题为“碧霞显圣”：泰山日轮、山影、祥云、法阵与金色呼吸动画。

## 资源处理结果

原模型 `mazu_figurine.glb` 未被覆盖。为小程序真机渲染生成移动端副本：

| 资源 | 大小 | 结构 | SHA-256 |
| --- | ---: | --- | --- |
| `bixia-yuanjun-mobile-v2.glb` | 6,826,708 B | 56,838 顶点、70,000 三角面、1 个 PBR 网格 | `D08846D662B2DA37B647F8EA2F1EE6B6ACA28A4A7CCDF6C121C58F19DD70C723` |
| `bixia-aura-prototype.glb` | 30,024 B | 6 个透明网格、608 三角面、12 秒循环动画 | `1ABCAB8649DCFF362E23A443CCDC1190318A8C23E33A4F7C5C2DD0DEEA876683` |
| `bixia-yuanjun.png` | 121,644 B | 512×512 临时识别正面图 | `B64E6703E68EF767F9C9E87D3C7BF370FB23AF51F010949BF03F9B1FD4C3894E` |

识别目标已生成 770 个本地特征点。当前识别方式仍是平面图像识别：请扫描这张正面图；它不等同于任意角度的三维实物识别。正式更换识别卡时，必须重新训练目标数据。

概念图只用于确认美术方向，不参与运行时渲染。运行时光效是单独制作并由现有 GLB 动画渲染器驱动的模型。

## 腾讯云部署步骤（真机前必须完成）

代码已预留下列正式地址，但本仓库没有项目腾讯云账号凭据，不能代替管理员上传：

1. 将 `recovery-assets/models/NewScenes/BixiaYuanjun/bixia-yuanjun-mobile-v2.glb` 上传为 `AR-YSJ/NewScenes/BixiaYuanjun/bixia-yuanjun-mobile-v2.glb`。
2. 将 `recovery-assets/models/NewScenes/BixiaYuanjun/bixia-aura-prototype.glb` 上传为 `AR-YSJ/NewScenes/BixiaYuanjun/bixia-aura-prototype.glb`。
3. 保持文件名、大小写和目录完全一致，并确保现有下载域名白名单继续包含 `7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la`。
4. 上传后在浏览器分别访问资源 URL，确认返回 HTTP 200，而不是 404 或鉴权页面。

未完成上传时，入口和图像识别可以启动，但主模型与光效会显示下载失败；这不应被误判为代码已完成云端部署。

## 真机验收

1. 在选择页点击“泰山老奶奶原生 AR 体验”。
2. 首次进入授权摄像头，确认相机画面连续、清晰。
3. 扫描 `recovery-assets/cards/bixia-yuanjun.png`，确认绿色识别框贴合图像。
4. 确认人物模型在识别图上稳定出现，日轮、山影、祥云和法阵按 12 秒周期运动。
5. 连续移动、倾斜、短暂遮挡识别图，确认跟踪、重定位和姿态滤波正常。
6. 回归六个原场景及 Android/iOS 原入口，确认没有行为变化。

## 后续建议

- 真机验收后再根据屏幕效果微调人物比例、光效透明度与位置。
- 若转为正式第七场景，先制作专用高对比度识别卡，再训练新特征并纳入自动识别；不要直接复用当前临时正面图。
- 音效目前有意留空，避免伪造或误用旧场景音频；可在文化内容确认后补充泰山晨钟、风声和正式讲解。
