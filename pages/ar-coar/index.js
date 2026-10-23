"use strict";

var scenes = require("../../config/coar-scenes.js");
var TEST_SCENE_ID = "1b578ca68a66422b810183d10361cac3";
var TEST_MARKER_URL = "https://coar.oss-cn-shenzhen.aliyuncs.com/app/common/image/image-ar-qingwa.jpg";
var PALM_WEB_AR_DEMO_SCENE_ID = "d6d2f3fee7034506be4772d21aef7ff5";

Page({
  data: {
    sceneTitle: "官方青蛙图片 AR 示例",
    isBusiness: false,
    isWebArFallback: false,
    arStarted: false,
    variant: "collection",
    availableVariants: [],
    sceneId: TEST_SCENE_ID,
    markerUrl: TEST_MARKER_URL,
    screenIndicate: {
      showIndicate: true,
      showWatermark: false
    },
    toolbar: {
      showShare: false,
      showScreenshot: false,
      showAudio: false
    }
  },

  onLoad: function (options) {
    if (options.demo === "palm") {
      this.setData({
        sceneTitle: "共创 AR 手掌 WebAR 示例",
        isWebArFallback: true,
        sceneId: PALM_WEB_AR_DEMO_SCENE_ID,
        markerUrl: ""
      });
      wx.setNavigationBarTitle({ title: "鸿蒙 WebAR 兼容测试" });
      return;
    }

    if (!options.scene) return;
    var scene = scenes[options.scene];
    this.sceneConfig = scene || null;
    this.setData({ isBusiness: true, sceneTitle: scene ? scene.title : "未知场景",
      sceneId: scene ? scene.variants.collection.sceneId : "",
      markerUrl: scene ? scene.markerUrl : "",
      availableVariants: scene ? Object.keys(scene.variants).filter(function (key) {
        return !!scene.variants[key].sceneId;
      }).map(function (key) {
        return { key: key, label: scene.variants[key].label || (key === "collection" ? "收藏版" : "盲盒版") };
      }) : [] });

    if (scene) {
      wx.setNavigationBarTitle({ title: scene.title + " AR" });
    }
  },

  chooseVariant: function (event) { this.selectVariant(event.currentTarget.dataset.variant); },
  selectVariant: function (variant) {
    if (!this.sceneConfig || !this.sceneConfig.variants[variant] || !this.sceneConfig.variants[variant].sceneId) return;
    this.setData({ variant: variant, sceneId: this.sceneConfig.variants[variant].sceneId });
  },

  startImageAr: function () {
    if (!this.data.sceneId) {
      wx.showModal({ title: "场景准备中", content: "该版本的 AR 内容尚未发布，请稍后再试。", showCancel: false });
      return;
    }

    if (this.data.isBusiness) {
      this.setData({ arStarted: true });
      return;
    }

    wx.navigateTo({
      url: "plugin://coar/coar-scene?sceneId=" + encodeURIComponent(this.data.sceneId),
      fail: function (error) {
        console.error("打开 AR 图片识别场景失败", error);
        wx.showModal({
          title: " AR 打开失败",
          content: error.errMsg || "请确认插件已添加、版本已通过并已配置摄像头隐私说明。",
          showCancel: false
        });
      }
    });
  },

  previewMarker: function () {
    wx.previewImage({
      current: this.data.markerUrl,
      urls: [this.data.markerUrl],
      fail: function (error) {
        console.error("打开 AR 识别图失败", error);
        wx.showToast({ title: "识别图加载失败", icon: "none" });
      }
    });
  }
});
