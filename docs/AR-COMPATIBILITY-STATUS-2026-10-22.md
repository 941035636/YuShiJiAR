> 当前更新：已移除 Kivicube，鸿蒙入口统一接入共创 AR；保留官方测试入口。用户已确认鸿蒙官方示例验证成功。以下旧架构描述属于历史记录。当前迁移进度见 docs/COAR-MIGRATION.md。

# AR 跨平台兼容开发记录（2026-10-22）

## 1. 项目与目标

- 小程序：遇石记 AR 幻境
- 正式 AppID：`wx8d8d557b77c8ad75`
- 原有技术：微信原生小程序 + XR-Frame Marker AR
- 本轮目标：保留 Android/iOS 原有 XR-Frame 功能，为纯血鸿蒙版微信寻找可以拉起摄像头并执行图片 AR 的兼容方案。

## 2. 当前架构

| 平台或用途 | 当前实现 | 状态 |
| --- | --- | --- |
| Android/iOS 正式业务入口 | XR-Frame 六套原场景 | 保留，未改写 |
| `ohos`/`ohos_pc` 正式业务入口 | Kivicube 统一页面 | 已接入，六套正式 `sceneId` 尚未配置 |
| Kivicube 兼容测试 | `pages/ar-harmony` 分包 | Android 真机验证通过，纯血鸿蒙待验证 |
| 共创 AR 兼容测试 | `pages/ar-coar` 分包 | Android 真机验证通过，纯血鸿蒙待验证 |

平台判断和正式业务路由位于 `utils/ar-navigation.js`。当前共创 AR 仅提供独立测试入口，没有替换正式鸿蒙业务路由。

## 3. 已完成工作

### 3.1 正式 AppID 与插件权限

- 工程使用正式 AppID `wx8d8d557b77c8ad75`。
- 微信公众平台已添加 Kivicube 插件 `wx3bbab3920eabccb2`。
- 微信公众平台已添加共创 AR 插件 `wx5024d89e4b208ce6`。

### 3.2 Kivicube 验证

- 插件版本：`2.16.2`。
- 接入页面：`pages/ar-harmony/index`。
- 官方测试场景：`DubKHBcADQ4sH4sfHR4N5s50LSarG9cI`。
- Android 微信中已实际验证：摄像头可打开、识别图可追踪、AR 内容可显示。
- 免费基础版不具备本项目所需的免费商用授权，因此保留为技术备用和效果基准。

### 3.3 包体积问题处理

Kivicube 最初以全局插件方式接入后，预览出现：

```text
source size 2110KB exceed max limit 2MB
```

开发者工具历史记录显示，未加入插件时完整业务包约为 `289 KB`。处理方式是将 Kivicube 移入 `pages/ar-harmony` 独立分包，并把插件声明放入该分包。调整后预览不再出现 2 MB 超限错误。

共创 AR 同样放入 `pages/ar-coar` 独立分包，避免第三方插件进入主包，同时与 Kivicube 相互隔离。

### 3.4 共创 AR 验证

- 插件版本：`11.1.1`。
- 插件官方示例源码：`https://github.com/quyingyong/applet-AR`。
- 官方图片 AR 测试场景：`1b578ca68a66422b810183d10361cac3`。
- 官方识别图：`https://coar.oss-cn-shenzhen.aliyuncs.com/app/common/image/image-ar-qingwa.jpg`。
- 新增测试页面：`pages/ar-coar/index`。
- Android 微信预览版中已实际验证：共创 AR 可以打开摄像头并识别官方图片，AR 效果正常显示。

## 4. 本轮验证结论

### 已实际验证成功

- 正式 AppID 下的插件授权生效。
- Kivicube 插件可以在 Android 微信运行图片 AR。
- 共创 AR 插件可以在 Android 微信运行图片 AR。
- Kivicube 分包处理解决了主包 2 MB 超限问题。
- 两个插件可以在同一工程中以独立分包形式共存。

### 已找到线索但尚未验证

- 共创 AR 官方示例声明插件免费、所有用户可直接使用且无限制。
- 共创 AR 基于微信 VisionKit 封装，但尚未获得其对纯血鸿蒙版微信支持的公开书面说明。

### 尚未恢复或需要额外资源

- 纯血鸿蒙版微信真机验证，需要客户或测试人员提供设备。
- 共创 AR 免费商用范围、服务期限、并发限制、数据存储及后续收费政策，需要插件方书面确认。
- “遇石记”六套正式识别图、GLB、动画、音频和收藏版/盲盒版交互尚未迁移到共创 AR 平台。
- 共创 AR 当前使用的是插件方官方青蛙测试场景，不是“遇石记”正式内容。

## 5. 测试入口规则

- 开发版和体验版：Android、iOS、鸿蒙均显示 Kivicube 与共创 AR 两个测试入口。
- 正式版：测试入口目前仅在 `ohos`/`ohos_pc` 显示。
- 共创 AR 测试入口先进入本工程说明页，再跳转到插件官方图片 AR 页面。

## 6. 正式上线前的必要工作

1. 使用纯血鸿蒙版微信分别测试共创 AR 和 Kivicube：首次授权、拒绝后重新授权、弱网、前后台切换及连续进入退出。
2. 向共创 AR 插件方取得关于免费商用和纯血鸿蒙支持的书面确认。
3. 在共创 AR 平台创建至少一套“遇石记”正式 POC，验证原模型、材质、动画和识别图的兼容性。
4. POC 通过后再决定是否把 `ohos`/`ohos_pc` 正式路由从 Kivicube 切换为共创 AR。
5. 完成六套场景迁移、资源清单核对、隐私保护指引和正式版回归测试。

## 7. 相关文件

- `app.json`：Kivicube、共创 AR 独立分包和插件声明。
- `utils/ar-navigation.js`：平台判断和正式 AR 路由。
- `pages/ar-harmony/`：Kivicube 兼容页面。
- `config/kivicube-scenes.js`：Kivicube 场景映射。
- `pages/ar-coar/`：共创 AR 兼容测试页面。
- `pages/selectModel/`：开发版/体验版测试入口。
- `docs/HARMONY-KIVICUBE-INTEGRATION.md`：Kivicube 接入与迁移说明。
- `docs/HARMONY-COAR-INTEGRATION.md`：共创 AR 接入与验证说明。
