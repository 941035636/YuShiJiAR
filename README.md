# 遇石记AR幻境（恢复工程）

这是从有权管理的微信小程序发布包恢复出的可维护工程。

- AppID：`wx8d8d557b77c8ad75`
- 用户提供的线上版本：`1.0.6`
- 技术框架：微信原生小程序 + XR-Frame Marker AR
- 页面：9 个主包页面 + 2 个 AR 兼容测试分包页面
- AR 场景：6 个
- 恢复资源：33 个 GLB、9 个音频、6 张 Marker 图及 UI/纹理素材

## 导入

直接使用微信开发者工具导入仓库根目录。`project.config.json` 已包含 AppID。

当前工程已经通过 JSON、JavaScript 语法、相对依赖、WXML 标签、本地资源路径、页面完整性和组件映射的静态校验，并已在微信开发者工具中使用正式 AppID 完成编译和预览。原 XR-Frame 功能以及第三方 AR 插件仍需按平台执行真机回归。

## 鸿蒙兼容开发状态

- Android/iOS 正式入口继续使用原 XR-Frame。
- Kivicube 与共创 AR 以两个独立分包保留，避免插件导致主包超过 2 MB。
- Kivicube 和共创 AR 官方图片 AR 测试场景均已在 Android 微信验证通过。
- 纯血鸿蒙版微信、免费商用授权以及六套正式场景迁移尚待完成。

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
