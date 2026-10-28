> 2026-10-28 锯齿修复：体验版录屏反馈后，已分离 480×640 取帧与模型绘制分辨率，新增清晰/高清档位、系统抗锯齿检查与 FXAA 回退、贴图多级过滤。诊断版本 `20261028-aa-1`，离线/桌面 GPU 检查通过，手机清晰度与帧率待复测。见 [锯齿修复与复测步骤](docs/NATIVE-AR-ANTIALIAS-2026-10-28.md)。

> 2026-10-28 开发更新：鸿蒙本尊新增原版素材对照、法线/金属/粗糙度增强材质、特效亮度和全屏主视图，保留调试与简化回退。离线与桌面 GPU 检查通过，新画面仍需鸿蒙真机复测。下次继续请先看 [画面优化与交接](docs/NATIVE-AR-VISUAL-OPTIMIZATION-2026-10-28.md)。

> 2026-10-27 最新真机复测：用户提供纯血鸿蒙 7.0、新 AppID 体验版视频，墨玉模型、盾、山、法阵和文字已显示并跟随识别图，页面抽样预览约 18～23 帧/秒。此前域名拦截本轮已恢复；音频细项、完整丢失恢复与长时间运行仍待验收。见 [复测与加载问题交接](docs/NATIVE-AR-LOAD-DIAGNOSTICS-2026-10-27.md)。

> 2026-10-26：鸿蒙原生定位与墨玉 3D 模型已由用户真机验证显示（截图约 9.6 帧/秒）。现已接入盾、山、法阵、文字特效及讲解/环境音，等待完整场景真机验收。继续开发请先阅读 [当前交接记录](docs/NATIVE-IMAGE-TRACKING-POC.md)；下方部分内容为恢复及旧方案历史。

> 下次继续开发请先看 [2026-10-26 开发总结与交接](docs/DEVELOPMENT-HANDOFF-2026-10-26.md)，包含已验证结果、待验收项目与操作步骤。

> 2026-10-27：已确认共创 AR 小程序插件不支持目标纯血鸿蒙客户端，工程已移除该插件及其分包。鸿蒙“本尊”入口现使用自研 `camera + onCameraFrame + JSFeat + WebGL` 路线；其余五套场景尚待迁移。

# 遇石记AR幻境（恢复工程）

这是从有权管理的微信小程序发布包恢复出的可维护工程。

- 原正式 AppID：`wx8d8d557b77c8ad75`；当前也可使用不依赖第三方插件的新小程序 AppID
- 用户提供的线上版本：`1.0.6`
- 技术框架：微信原生小程序 + XR-Frame Marker AR
- 页面：9 个主包页面 + 3 个自研 AR 验证分包页面
- AR 场景：6 个
- 恢复资源：33 个 GLB、9 个音频、6 张 Marker 图及 UI/纹理素材

## 导入

直接使用微信开发者工具导入仓库根目录。开发测试时以本地 `project.config.json` 中的 AppID 为准。

当前工程已经通过 JSON、JavaScript 语法、相对依赖、WXML 标签、本地资源路径、页面完整性和组件映射的静态校验。原 XR-Frame 和自研鸿蒙 AR 仍需分别按平台执行真机回归。

## 鸿蒙兼容开发状态

- Android/iOS 正式入口继续使用原 XR-Frame。
- 工程不再声明 Kivicube 或共创 AR 插件，新 AppID 无需申请第三方 AR 插件权限。
- 纯血鸿蒙“本尊”入口使用自研图片追踪与 WebGL 模型渲染；基础相机、实时帧和完整场景仍需在目标微信版本真机验收。
- 常胜、招财、自在、进喜、纳福五套场景尚未迁移到自研引擎，鸿蒙端会明确提示“适配中”。

完整过程和当前边界见 [`docs/AR-COMPATIBILITY-STATUS-2026-10-22.md`](docs/AR-COMPATIBILITY-STATUS-2026-10-22.md)。

## 目录

```text
AR/                    XR-Frame 组件
pages/                 页面
images/                主包本地图片
recovery-assets/       下载并校验的 UI、模型、纹理和音频归档
recovery-reports/      解密、资源和工程验证报告
recovery-tools/        可重复执行的本地恢复脚本
```

`recovery-assets/` 使用 Git LFS。克隆后请确保已安装 Git LFS，并运行：

```bash
git lfs install
git lfs pull
```

## 重要说明

- 恢复后的 JavaScript 来自发布包逻辑模块拆分。
- WXML/WXSS 是依据编译模板做的语义重建，不等同于原始源码的排版、变量名和注释。
- 线上工程继续使用远程资源 URL；`recovery-assets/` 是离线维护归档，不应整体打入微信小程序主包。
- 完整恢复结论见 [`recovery-reports/RECOVERY-REPORT.md`](recovery-reports/RECOVERY-REPORT.md)。
