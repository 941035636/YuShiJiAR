"use strict";

var sceneConfig = require("../../config/kivicube-scenes.js");
var kivicube = requirePlugin("kivicube");

function stringifyError(detail) {
  if (!detail) return "未知错误";
  if (typeof detail === "string") return detail;
  if (detail.errMsg) return detail.errMsg;
  if (detail.message) return detail.message;
  try {
    return JSON.stringify(detail);
  } catch (error) {
    return "插件运行异常";
  }
}

Page({
  data: {
    sceneKey: "",
    sceneId: "",
    sceneTitle: "未知场景",
    marker: "未配置",
    configured: false,
    status: "loading",
    statusText: "正在初始化鸿蒙 AR",
    progressText: "",
    setupMessage: "请先在 Kivicube 创建图像 AR 场景，并在 config/kivicube-scenes.js 中填写 sceneId。"
  },

  onLoad: function (options) {
    var sceneKey = options.scene || "";
    var scene = sceneConfig.getScene(sceneKey);

    if (!scene) {
      this.setData({
        sceneKey: sceneKey,
        status: "error",
        setupMessage: "没有找到对应的场景配置，请检查入口参数。"
      });
      return;
    }

    var sceneId = String(scene.sceneId || "").trim();
    this.setData({
      sceneKey: sceneKey,
      sceneId: sceneId,
      sceneTitle: scene.title,
      marker: scene.marker,
      configured: sceneId.length > 0
    });

    wx.setNavigationBarTitle({ title: "遇石记AR幻境 · " + scene.title });
    wx.setKeepScreenOn({ keepScreenOn: true });
  },

  onUnload: function () {
    if (kivicube && typeof kivicube.clearSceneCache === "function") {
      kivicube.clearSceneCache();
    }
  },

  handleReady: function (event) {
    console.log("Kivicube 场景信息", event.detail && event.detail.sceneInfo);
    this.setData({ status: "loading", statusText: "正在加载 " + this.data.sceneTitle });
  },

  handleDownloadStart: function () {
    this.setData({ statusText: "正在下载 AR 素材", progressText: "0%" });
  },

  handleDownloadProgress: function (event) {
    var progress = Number(event.detail);
    if (!isFinite(progress)) return;
    this.setData({ progressText: Math.round(progress * 100) + "%" });
  },

  handleDownloadEnd: function () {
    this.setData({ statusText: "素材下载完成", progressText: "" });
  },

  handleLoadStart: function () {
    this.setData({ statusText: "正在构建 AR 场景", progressText: "" });
  },

  handleLoadEnd: function () {
    this.setData({ statusText: "请将摄像头对准识别图" });
  },

  handleSceneStart: function () {
    this.setData({ status: "ready", statusText: "请扫描“" + this.data.sceneTitle + "”识别图" });
  },

  handleTracked: function () {
    this.setData({ status: "tracked", statusText: "已识别“" + this.data.sceneTitle + "”" });
  },

  handleLostTrack: function () {
    this.setData({ status: "ready", statusText: "请重新对准识别图" });
  },

  handleError: function (event) {
    var detail = event.detail || {};
    console.error("Kivicube AR 错误", detail);
    this.setData({ status: "error", statusText: "AR 打开失败：" + stringifyError(detail), progressText: "" });

    if (!detail.isCameraAuthDenied) return;

    var page = this;
    wx.showModal({
      title: "需要摄像头权限",
      content: "请允许“遇石记AR幻境”使用摄像头，授权后将重新打开当前场景。",
      confirmText: "去设置",
      success: function (result) {
        if (!result.confirm) return;
        wx.openSetting({
          success: function (settings) {
            if (settings.authSetting["scope.camera"]) {
              if (kivicube && typeof kivicube.clearSceneCache === "function") {
                kivicube.clearSceneCache();
              }
              wx.redirectTo({
                url: "/pages/ar-harmony/index?scene=" + encodeURIComponent(page.data.sceneKey)
              });
            }
          }
        });
      }
    });
  },

  goBack: function () {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: "/pages/selectModel/index" });
    }
  }
});
