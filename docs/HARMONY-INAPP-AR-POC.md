# 鸿蒙小程序内 AR：自有域名原型验证

日期：2026-10-25。状态：原型已准备，尚未部署，尚未在鸿蒙小程序 web-view 内验证成功。

## 目标与判断

用户要求小程序内直接体验 AR；网页二维码只作为备用，复制链接不作为正式用户流程。

现有共创 AR 插件在鸿蒙弹出网页访问提示，无法完成直接体验；共创 AR 不提供 go3d.cn 的业务域名校验配合。此限制不等于公司自有域名不能部署网页。

本轮验证路线：遇石记小程序 → 自有 HTTPS 域名的 web-view → 本机相机＋MindAR 图像追踪＋本尊 GLB/动画/讲解。没有第三方页面跳转、iframe 嵌套或代理 go3d.cn；模型和运行库部署到同一站点。

MindAR 官方说明支持图像追踪、Three.js/AFRAME 集成、静态网页自行托管。库为 MIT 许可，分发时保留版权与许可。采用它不等于已证明鸿蒙小程序容器提供 getUserMedia/WebGL：这正是第一项必须测试的能力。

用户确认公司有域名，部署权限待确认。不能将本原型描述为已找到经真机证明的最终方案。

## 本地准备内容

- `web-ar/probe.html`：无第三方依赖的相机能力测试，显示安全上下文、WebGL、getUserMedia 和实际视频分辨率；画面仅在设备内处理。
- `web-ar/index.html`：本尊图像追踪原型，默认加载墨玉模型，手动加载四项特效，显式开启音频；目标丢失及后台暂停音频。
- `web-ar/compile.html`：电脑端识别目标编译工具，输出 `tssgd.mind`。
- `config/self-hosted-ar.js`：自有 HTTPS 网页根目录配置，默认留空；没有配置时显示未开通，不加载第三方地址。
- `pages/ar-self-hosted/`：小程序内 web-view 验证分包；入口仅开发版、体验版显示。默认相机测试；`?mode=ar` 直接打开图片追踪原型。
- `recovery-tools/prepare-self-hosted-ar.ps1`：检查 GLB/LFS 文件、复制资源、下载固定版本依赖及许可证，生成部署包。
- `artifacts/yushiji-self-hosted-ar.zip`：网页部署包。vendor/assets/artifacts 被 Git 忽略，可由脚本重建，整个 web-ar/artifacts 已排除小程序打包。

运行库固定为 MindAR 1.2.5、AFRAME 1.5.0。原型没有共创 AR 的界面水印，但保留开源库许可，不修改第三方托管网页。

## 部署与验收顺序

1. 确认公司网站可部署静态文件、使用有效 HTTPS、可在根目录放微信校验文件，并且小程序后台具备业务域名配置资格。按照后台实际要求完成配置；无需共创 AR 配合。
2. 将部署包解压至自有站点的独立目录，比如 `/yushiji-ar/`。这是路径示例，不能作为真实域名直接使用。
3. 配置正确 MIME：HTML=text/html；JS=text/javascript 或 application/javascript；GLB=model/gltf-binary；MIND=application/octet-stream；MP3=audio/mpeg。不要把 JS 当 text/plain 返回。不要将素材请求重写为 HTML 首页。
4. 设置 `config/self-hosted-ar.js` 的 baseUrl 为该 HTTPS 目录，生成小程序预览。
5. 在鸿蒙微信预览版，从“小程序内 AR 能力验证”进入 probe.html，手动允许相机。要求出现实时后置画面和非零分辨率，WebGL 可用。聊天链接或系统浏览器通过不能替代本步。
6. 若容器未提供相机接口或取帧失败，先排查权限/版本；若明确为容器限制，本路线不能宣称可行，停止在该页面堆模型，并记录实际错误。
7. 部署包已包含本尊 tssgd.mind，无需再次编译。若更换识别图，则在电脑打开 compile.html 编译，并把下载结果放到服务器 assets/ 中。
8. 在小程序内从 probe.html 打开图片追踪页，验证本尊 tssgd.jpg 识别、模型方向、材质和丢失恢复。
9. 逐项验证特效和音频。原型的坐标和缩放是 MindAR 初始值，不是共创 AR 场景转换后的最终值，必须按实际卡片校准；不能继承旧场景的验证结论。
10. 只有整个小程序内流程通过后，才将本尊鸿蒙正式业务入口切到新页面，并移除用户复制链接等操作。其余平台和场景先保留原实现。

## 来源

- MindAR：https://github.com/hiukim/mind-ar-js
- 安装与固定版本示例：https://hiukim.github.io/mind-ar-js-doc/installation/
- 图像追踪与 Three.js：https://hiukim.github.io/mind-ar-js-doc/more-examples/threejs-image/
- MIT 许可：https://github.com/hiukim/mind-ar-js/blob/master/LICENSE
- 腾讯业务域名配置：https://cloud.tencent.com/document/product/1301/100434

## 当前必须补齐的信息

自有站点的实际 HTTPS 地址、部署权限以及微信后台的业务域名配置结果。当前没有部署入口，不能执行外部部署或鸿蒙小程序内真机验证。

## 本地验证结果

- 识别图已通过浏览器编译，生成 422497 字节的 tssgd.mind，保存到 recovery-assets/cards/tssgd.mind 并加入部署包；无需重新编译，compile.html 保留用于更换识别图。
- 浏览器加载本尊原型时主模型请求正常，运行日志未发现错误；没有使用桌面相机假装完成鸿蒙验证。
- 工程静态检查及自有 HTTPS 配置、固定页面路由、失败状态、小程序包排除检查通过。
- 尚未在鸿蒙小程序 web-view 内验证相机与追踪；特效的位置、比例仍为初始值，未做真机还原。
