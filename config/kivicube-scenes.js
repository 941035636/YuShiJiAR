"use strict";

// 在 Kivicube 平台创建六个“图像 AR”场景后，仅需填写 sceneId。
// 空 sceneId 会显示配置提示，不会把无效值传给插件。
var scenes = {
  "ben-zun": {
    title: "本尊",
    marker: "tssgd.jpg",
    sceneId: ""
  },
  "chang-sheng": {
    title: "常胜",
    marker: "qkds.jpg",
    sceneId: ""
  },
  "zhao-cai": {
    title: "招财",
    marker: "dcdy.jpg",
    sceneId: ""
  },
  "zi-zai": {
    title: "自在",
    marker: "wszz.jpg",
    sceneId: ""
  },
  "jin-xi": {
    title: "进喜",
    marker: "xctj.jpg",
    sceneId: ""
  },
  "na-fu": {
    title: "纳福",
    marker: "syjd.jpg",
    sceneId: ""
  }
};

function getScene(sceneKey) {
  return scenes[sceneKey] || null;
}

module.exports = {
  scenes: scenes,
  getScene: getScene
};
