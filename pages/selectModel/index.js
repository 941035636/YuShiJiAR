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
  openNativeExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=ben-zun", fail: function () {
      wx.showToast({ title: "AR 体验打开失败", icon: "none" });
    } });
  },
  data: { pageList: {} },
  onReady: function () {},
  onShow: function () {},
  onHide: function () {},
  onUnload: function () {},
  onPullDownRefresh: function () {},
  onReachBottom: function () {},
  onShareAppMessage: function () {},
  onShareTimeline: function () {}
});
