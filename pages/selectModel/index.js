"use strict";

var arNavigation = require("../../utils/ar-navigation.js");

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
  data: { pageList: {}, showCoarPoc: false },
  onLoad: function () {
    var platform = arNavigation.getPlatform();
    var envVersion = "release";

    try {
      envVersion = wx.getAccountInfoSync().miniProgram.envVersion || "release";
    } catch (error) {
      console.warn("读取小程序版本类型失败", error);
    }

    this.setData({
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
