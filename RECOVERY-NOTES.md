# 恢复工程说明

- AppID: wx8d8d557b77c8ad75
- JS 来自发布包逻辑模块拆分，仅修复了可确认的中文乱码。
- WXML/WXSS 由发布包编译模板语义重建，不等同于原始排版、变量名和注释。
- 远程素材 URL 保持发布版引用，离线归档位于同级 assets 目录，不直接塞入主包。
- XR-Frame 组件使用 renderer=xr-frame；AR 页面通过 usingComponents 引用对应组件。
- project.config.json 使用 trial 基础库，首次导入后请在开发者工具中按当前兼容版本锁定。
