"use strict";

var arNavigation = require("../../utils/ar-navigation.js");
var selfHostedConfig = require("../../config/self-hosted-ar.js");

Page({
  btnBenZun: function () {
    arNavigation.openArScene("ben-zun", "/pages/ar/scene-ar-BenZun/index");
  },
  selectbtn: function () {
    arNavigation.openArScene("chang-sheng", "/pages/ar/scene-ar-oceanWorld/index");
  },
  selectZaoCai: function () {
    arNavigation.openArScene("zhao-cai", "/pages/ar/scene-ar-ZhaoCai/index");
  },
  selectZiZai: function () {
    arNavigation.openArScene("zi-zai", "/pages/ar/scene-ar-ZiZai/index");
  },
  selectJinXi: function () {
    arNavigation.openArScene("jin-xi", "/pages/ar/scene-ar-JinXi/index");
  },
  selectNaFu: function () {
    arNavigation.openArScene("na-fu", "/pages/ar/scene-ar-NaFu/index");
  },
  openCoarPoc: function () {
    wx.navigateTo({
      url: "/pages/ar-coar/index?scene=ben-zun",
      fail: function (error) {
        console.error("打开共创 AR 测试页失败", error);
        wx.showToast({ title: "共创 AR 测试页打开失败", icon: "none" });
      }
    });
  },
  openCoarWebAr: function () {
    wx.navigateTo({
      url: "/pages/ar-coar/index?scene=ben-zun&mode=webar",
      fail: function (error) {
        console.error("打开共创 AR WebAR 兼容测试失败", error);
        wx.showModal({
          title: "WebAR 兼容测试打开失败",
          content: error.errMsg || "请确认共创 AR 插件已添加且版本已通过。",
          showCancel: false
        });
      }
    });
  },
  openSelfHostedAr: function () {
    wx.navigateTo({ url: "/pages/ar-self-hosted/index", fail: function () {
      wx.showToast({ title: "验证页面打开失败", icon: "none" });
    } });
  },
  openNativeProbe: function () {
    wx.navigateTo({ url: "/pages/ar-native-probe/index", fail: function () {
      wx.showToast({ title: "检测页面打开失败", icon: "none" });
    } });
  },
  openNativeTracker: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index", fail: function () {
      wx.showToast({ title: "图片追踪页面打开失败", icon: "none" });
    } });
  },
  data: { pageList: {}, showCoarPoc: false, showSelfHostedPoc: false, showNativePoc: false },
  onLoad: function () {
    var platform = arNavigation.getPlatform();
    var envVersion = "release";

    try {
      envVersion = wx.getAccountInfoSync().miniProgram.envVersion || "release";
    } catch (error) {
      console.warn("读取小程序版本类型失败", error);
    }

    this.setData({
      showSelfHostedPoc: envVersion !== "release" && /^https:\/\//i.test(String(selfHostedConfig.baseUrl || "").trim()),
      showNativePoc: envVersion !== "release",
      showCoarPoc: arNavigation.isHarmonyPlatform(platform) || envVersion !== "release"
    });
  },
  onReady: function () {},
  onShow: function () {},
  onHide: function () {},
  onUnload: function () {},
  onPullDownRefresh: function () {},
  onReachBottom: function () {},
  onShareAppMessage: function () {},
  onShareTimeline: function () {}
});
