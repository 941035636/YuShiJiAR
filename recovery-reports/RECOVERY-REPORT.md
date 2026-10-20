# 「遇石记AR幻境」微信 AR 小程序恢复报告

生成日期：2026-10-20  
AppID：`wx8d8d557b77c8ad75`  
用户提供的线上版本：`1.0.6`（发布包内部未发现可独立核对的语义版本字段）

## 结论摘要

- **已实际验证恢复成功**：`V1MMWX` 解密、标准 wxapkg 容器校验、69 个包内文件提取、62 个本项目腾讯云远程资源下载、33 个 GLB 校验、267 张 GLB 内嵌纹理提取、JS/JSON/WXML/WXSS 工程重建和静态完整性校验。
- **已找到线索但尚未完成运行验证**：恢复工程具备微信开发者工具所需入口和页面/组件结构，但本机未安装微信开发者工具，未做真实编译和手机端 XR/相机/Marker 测试。
- **无法精确恢复**：原始变量名、注释、源码排版及编译前 WXML/WXSS 的逐字节形式。当前 WXML/WXSS 是依据发布包模板做的语义重建，不冒充原始源码。
- **需要额外权限确认**：3 个 `cyvideo.i-oranges.com` 资源和 1 个 `mmbiz.qpic.cn` 默认头像 URL 未下载；它们不属于已确认的项目腾讯云存储桶。

## 1. 原始发布包格式检测

原始文件：`original/__APP__.wxapkg`

| 项目 | 结果 | 状态 |
|---|---:|---|
| 文件大小 | 512,411 字节 | 已验证 |
| 文件头 | `56 31 4D 4D 57 58` / `V1MMWX` | 已验证 |
| SHA-256 | `E5FE621AEA4B9DD98FD5288AF71D56554650FFBA10790BA055694B65C3FA61A2` | 已验证 |
| SHA-1 | `0E311752B7553474A0157592609C0637F40527C7` | 已验证 |
| MD5 | `D3BA9F31F789C3A26F267495A2105E4D` | 已验证 |
| Shannon 熵 | 6.864660 bits/byte | 已验证 |
| 格式判断 | Windows 微信 `V1MMWX` 加密封装 | 已验证 |

原始文件没有被修改。恢复目录中的 `original` 是从用户指定备份复制出的工作副本，SHA-256 与指定文件一致。

## 2. 解密与容器验证

采用已审阅的公开算法：

1. AppID 经 `PBKDF2-HMAC-SHA1`（salt=`saltiest`，1000 次，32 字节）派生 AES 密钥；
2. 固定 IV `the iv: 16 bytes`，AES-256-CBC 解密头部 1024 字节并取前 1023 字节；
3. 剩余数据使用 AppID 倒数第二个字符作单字节 XOR；
4. 用 Node.js 内置 `crypto` 实现，未执行第三方 EXE，也未上传包内容。

解密结果：

| 项目 | 结果 |
|---|---:|
| 明文包 | `decrypted/__APP__.decrypted.wxapkg` |
| 明文大小 | 512,404 字节 |
| SHA-256 | `A2756DA03E9CE6A42F60C35C25A2A68884F23A9BFD72A9B0FFF332CF15F1E252` |
| 首标记 | `0xBE` |
| 索引结束标记 | `0xED` |
| 索引长度 | 3,312 字节 |
| 正文长度 | 509,078 字节 |
| 文件数 | 69 |
| 长度关系 | `14 + 3312 + 509078 = 512404`，成立 |

此外逐项验证了文件偏移、长度边界、索引游标和输出路径，未发现越界、截断或路径穿越条目。因此解密成功不是仅凭首字节推断。

## 3. 解包文件清单

共提取 69 个文件：

| 类型 | 数量 |
|---|---:|
| JavaScript | 36 |
| HTML/编译模板 | 17 |
| `.fpcssb` | 8 |
| PNG | 4 |
| JSON | 3 |
| `.fpiib` | 1 |

完整逐文件名称、偏移、长度见 `package-manifest.json`；每个包内文件的大小与 SHA-256 见 `static-analysis.json`。

主要结构包括：

- `app-config.json`、`app-service.js`、`appservice.app.js`、`common.app.js`、`page-frame.html`；
- `pages/index`、`pages/selectModel`、`pages/logs`；
- 6 个 AR 页面：BenZun、oceanWorld、ZhaoCai、ZiZai、JinXi、NaFu；
- 6 个 `xr-ar-*` 组件及一个 `xr-demo-viewer` 组件。

## 4. UI 素材恢复

**已验证恢复：**

- `assets/ui` 共 18 个文件，约 2.98 MB；
- 13 个腾讯云 UI 图片全部下载并通过格式/长度/SHA-256 校验；
- 包内 4 个本地 PNG 已保留；
- 微信缓存中的 140×140 应用图标已另存为 `assets/ui/cache/app-icon.png`；
- UI 图片尺寸、大小、哈希见 `image-analysis.json`。

典型资源包括首页三张卡片、背景、顶部图、6 个角色/主题入口图、收藏版/盲盒版按钮、按键底图和应用图标。

## 5. 3D 模型、材质、纹理和动画

**已验证恢复：**

| 项目 | 数量/大小 |
|---|---:|
| GLB 引用文件 | 33 个，138,770,572 字节 |
| 唯一 GLB 内容 | 31 个（`dcdy02` 三个路径内容相同） |
| 网格 | 132 |
| 材质 | 129 |
| 内嵌纹理 | 267 张，已提取 |
| 带动画模型 | 20 个 |
| 动画 | 20 条 |
| AR Marker 图 | 6 张，均为 3648×5472 JPEG |

所有 GLB 均验证了 `glTF` 魔数、版本头和内部声明长度。模型的生成器、网格、材质、纹理、骨骼、动画名、扩展和 SHA-256 见 `glb-analysis.json`。

主要建模来源元数据包括 `Adobe Substance 3D Painter 8.3.0`、`THREE.GLTFExporter r164/r165`，以及一个 `babylon.js glTF exporter for 3dsmax 2022` 文件。

## 6. AR 技术框架识别

**已验证为微信 XR-Frame，不是通用 Three.js 页面。** 依据：

- `app-config.json` 明确声明 `renderer: "xr-frame"` 和 `xrPages`；
- 页面使用 `xr-scene`、`xr-assets`、`xr-asset-load`、`xr-gltf`、`xr-camera`、`xr-light`；
- 跟踪组件为 `xr-ar-tracker mode="Marker"`；
- 场景配置使用 `ar-system="modes:Marker; planeMode:3"`；
- 逻辑调用 `wx.getXrFrameSystem()`、`ARTracker` 和 `EARTrackerState`；
- 识别成功后切换模型显示并播放主题/环境音频。

6 个 Marker 映射：

| 场景组件 | Marker |
|---|---|
| BenZun | `Card/tssgd.jpg` |
| oceanWorld | `Card/qkds.jpg` |
| ZhaoCai | `Card/dcdy.jpg` |
| ZiZai | `Card/wszz.jpg` |
| JinXi | `Card/xctj.jpg` |
| NaFu | `Card/syjd.jpg` |

每个场景的 `asset-id`、模型 URL、位置、缩放、旋转、灯光和自动动画参数已保留在恢复后的组件 WXML 中。

## 7. 远程资源与分包依赖

静态代码发现 70 个精确 URL；去除同一路径不同签名参数后，本项目腾讯云存储桶有 62 个资源：

| 分类 | 数量 |
|---|---:|
| GLB 模型/动画 | 33 |
| UI/扫描动画图片 | 14 |
| Marker 图 | 6 |
| 音频 | 9 |

62/62 当前均可访问并已下载，总计 152,489,032 字节。下载结果、源 URL、输出路径、大小和 SHA-256 见 `asset-download.json`。

额外外部依赖（仅记录，未下载）：

- `https://cyvideo.i-oranges.com/ar/2023jcc/_2.gif`
- `https://cyvideo.i-oranges.com/ar/2023jcc/fed19f8544fd3b660a9d38b7245c3cc.png`
- `https://cyvideo.i-oranges.com/ar/cdxg/index/ai1.gif`
- `https://mmbiz.qpic.cn/.../0`（首页默认头像）

未发现 `wx.request`、`wx.downloadFile`、`wx.uploadFile`、`wx.cloud`、WebSocket 或其他业务接口调用。远程依赖主要由 WXML/XR-Frame 和音频上下文直接加载。

**分包结论：** 当前缓存目录只存在一个 `__APP__.wxapkg`；`app-config.json` 未声明 `subPackages/subpackages`，也没有独立 AR 分包线索。因此“该版本没有代码分包”已得到当前包和缓存双重支持。若其他微信账号/设备曾运行过不同版本，仍可另行扫描其缓存作为补充证据。

## 8. 恢复工程

工程目录：`recovered-project`

恢复结果：

- 9 个页面；
- 7 个组件，其中 6 个 XR-Frame AR 组件；
- 24 个 JavaScript 模块；
- 19 个 JSON、16 个 WXML、17 个 WXSS、4 个本地 PNG；
- 总计 81 个文件；
- 已生成 `app.js`、`app.json`、`app.wxss`、`project.config.json` 和 `sitemap.json`；
- 已补齐 Babel runtime、共享 Behavior、页面 Behavior、工具模块和 `usingComponents` 映射；
- 远程资源 URL 保持发布版行为，完整离线资产单独归档，避免把约 152 MB 资源错误塞入小程序主包。

自动静态验证结果：0 错误。检查项目包括 JSON 解析、JavaScript 语法、相对 `require`、WXML 标签平衡、本地素材路径、页面四件套和组件路径，详见 `project-validation.json`。

**尚未验证：** 本机未安装微信开发者工具，因此尚未执行开发者工具真实编译；也未在支持 XR-Frame 的微信真机环境测试相机权限、Marker 识别、模型渲染和音频策略。当前验收状态应称为“结构可导入、静态验证通过”，不是“运行验收完成”。

## 9. 尚未恢复或需要补充验证

### 已找到线索但尚未验证

- 微信开发者工具首次导入和编译；
- 真机 XR-Frame、相机权限和 6 个 Marker 实测；
- iOS/Android 音频自动播放和前后台恢复；
- 3 个 `cyvideo.i-oranges.com` 加载遮罩资源的归属及继续使用权限；
- `project.config.json` 当前使用 `trial` 基础库，需在开发者工具中锁定一个通过真机测试的版本。

### 无法精确恢复

- 原开发者变量名、注释、提交历史、构建配置和源码排版；
- 编译前 WXML/WXSS 的逐字节原文；
- 线上版本号 `1.0.6` 与缓存目录内部数字 `9` 的发布映射（包内无语义版本证据）；
- 未进入当前缓存的旧版本包或其他账号/设备缓存。

### 需要维护时重点复核

- AR 页面保留了发布包中的 `wx.getUserInfo()({...})` 形态；从静态代码看该调用方式可疑，建议在开发者工具运行后按实际报错决定是否改为 `wx.getUserProfile({...})`，当前未擅自改变业务逻辑。
- 发布版部分模型 URL 带旧签名参数、部分不带签名；虽然当前 62 个资源均可访问，建议迁移到自己持续控制的存储并统一 URL 策略。
- 外部资产总量远超主包限制，后续应继续走 CDN/云存储，不应直接复制到主包。

## 10. 后续建议

1. 安装微信开发者工具，用管理员账号导入 `recovered-project`，先完成一次不改代码的编译记录。
2. 在项目设置中确认 XR-Frame 支持的基础库版本、合法下载域名和资源域名。
3. 用 6 张已恢复 Marker 图进行真机矩阵测试，逐场景记录模型、动画、音频、切换按钮和退出清理。
4. 将 62 个已恢复资源迁移到项目方长期控制的存储，更新 URL 后逐一校验 SHA-256。
5. 将当前恢复目录纳入 Git；首次提交只保存恢复基线，后续 UI/模型替换分支开发。
6. 修复运行时问题时优先保留页面路由、XR 组件边界和 Marker 到模型的映射，避免一次性重写。

## 产物索引

- `package-manifest.json`：明文包结构和 69 个文件索引；
- `static-analysis.json`：包内文件哈希和 URL 清单；
- `remote-probe.json`：远程资源探测结果；
- `asset-download.json`：62 个已下载资源的验证记录；
- `glb-analysis.json`：33 个模型的结构和动画分析；
- `image-analysis.json`：292 张 UI/Marker/内嵌纹理清单；
- `project-validation.json`：恢复工程静态验证；
- `../tools`：可重复执行的本地分析工具；
- `../cache-snapshot`：当前微信缓存的只读快照；
- `../recovered-project`：可供微信开发者工具导入的恢复工程。

