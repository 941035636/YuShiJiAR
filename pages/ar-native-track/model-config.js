"use strict";
var base="https://7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la/AR-YSJ/";
module.exports = {
  // XR-Frame's marker callback enables this asset. Keep the jade asset for controlled comparison.
  defaultVariant:"reference",
  variants:{
    reference:{label:"原版对照素材",url:base+"Model/GoldModel/taishanshigandang.glb",sizeMB:8.5},
    jade:{label:"墨玉素材",url:base+"Model/taishanshigandang_yu.glb",sizeMB:8.7}
  },
  url:base+"Model/GoldModel/taishanshigandang.glb",
  maxBytes: 20*1024*1024,
  // Initial overlay follows the printed figure. These are adjustable calibration defaults.
  height: 0.42,
  centerX: 0,
  centerY: 0.03,
  fov: 50,
  lighting:{exposure:1,ambient:2,key:3,effectExposure:1.8}
};
