# 遇石记AR幻境（恢复工程）

这是从有权管理的微信小程序发布包恢复出的可维护工程。

- AppID：`wx8d8d557b77c8ad75`
- 用户提供的线上版本：`1.0.6`
- 技术框架：微信原生小程序 + XR-Frame Marker AR
- 页面：9 个
- AR 场景：6 个
- 恢复资源：33 个 GLB、9 个音频、6 张 Marker 图及 UI/纹理素材

## 导入

直接使用微信开发者工具导入仓库根目录。`project.config.json` 已包含 AppID。

当前工程已经通过 JSON、JavaScript 语法、相对依赖、WXML 标签、本地资源路径、页面完整性和组件映射的静态校验。由于恢复机器没有安装微信开发者工具，首次导入后仍需完成开发者工具编译和真机 XR 验证。

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

