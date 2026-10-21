# 鸿蒙微信 Kivicube AR 接入说明

## 已完成的代码改造

- Android、iOS 继续进入原有 XR-Frame 页面。
- `wx.getDeviceInfo().platform` 为 `ohos` 或 `ohos_pc` 时，进入 `pages/ar-harmony/index`。
- 鸿蒙页面接入 Kivicube `kivicube-scene` 组件，并处理场景加载、素材下载、追踪、丢失追踪、错误和摄像头权限事件。
- 页面退出时调用 `clearSceneCache()`，避免多次进入 AR 后插件资源未释放。
- 六个业务入口共用一个鸿蒙页面，通过 `config/kivicube-scenes.js` 映射 Kivicube 场景 ID。

## 上线前必须完成的外部配置

1. 在微信公众平台为 AppID `wx8d8d557b77c8ad75` 申请 Kivicube 插件：
   - 插件 AppID：`wx3bbab3920eabccb2`
   - 当前工程声明版本：`2.16.2`
2. 在服务器域名中把 `https://kivicube-resource.kivisense.com` 加入 `request` 和 `downloadFile` 合法域名。
3. 在 Kivicube 平台创建六个“图像 AR”场景，上传本项目有权使用的识别图、GLB、贴图和音频。
4. 把平台生成的六个 `sceneId` 填入 `config/kivicube-scenes.js`。
5. 使用微信开发者工具“预览”生成二维码，在纯血鸿蒙真机微信上验收。Kivicube 官方说明 AR 效果不应以模拟器为准，部分导出工程也不支持“真机调试”方式体验。

微信开发者工具应直接导入 Git 工作目录 `D:\ARRecovery\wx8d8d557b77c8ad75\git-YuShiJiAR`。`project.config.json` 已排除恢复报告、分析工具和 227 MiB 的归档资源，避免这些维护文件进入小程序发布包。旧目录 `recovery-1.0.6\recovered-project` 是测试 AppID 副本，不会自动同步 Git 修改。

在完成上述配置前，鸿蒙端会显示“鸿蒙 AR 场景尚未配置”，不会把空场景 ID 传给插件。

## 六个场景迁移表

| scene key | 页面名称 | 识别图 | 原 XR-Frame 页面 |
| --- | --- | --- | --- |
| `ben-zun` | 本尊 | `tssgd.jpg` | `pages/ar/scene-ar-BenZun/index` |
| `chang-sheng` | 常胜 | `qkds.jpg` | `pages/ar/scene-ar-oceanWorld/index` |
| `zhao-cai` | 招财 | `dcdy.jpg` | `pages/ar/scene-ar-ZhaoCai/index` |
| `zi-zai` | 自在 | `wszz.jpg` | `pages/ar/scene-ar-ZiZai/index` |
| `jin-xi` | 进喜 | `xctj.jpg` | `pages/ar/scene-ar-JinXi/index` |
| `na-fu` | 纳福 | `syjd.jpg` | `pages/ar/scene-ar-NaFu/index` |

建议先只迁移 `ben-zun`，完成“一张识别图 + 一个主模型”的 POC。确认客户鸿蒙手机可以稳定触发 `tracked`/`lostTrack` 后，再迁移其余模型、动画、音频和收藏版/盲盒版切换交互。

## 真机验收清单

- 鸿蒙微信打开六个入口时不加载 XR-Frame。
- 首次拒绝摄像头权限后，可以从设置重新授权并恢复。
- 弱网下能显示素材下载进度和可理解的错误信息。
- 连续进入、退出 AR 页面十次无明显内存增长或闪退。
- 每个识别图分别验证近距离、远距离、倾斜、短暂遮挡后的追踪恢复。
- Android 和 iOS 六个原 XR-Frame 页面均未发生回归。
