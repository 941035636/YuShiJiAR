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
  openNativeChangShengExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=chang-sheng", fail: function () {
      wx.showToast({ title: "常胜 AR 打开失败", icon: "none" });
    } });
  },
  openNativeZhaoCaiExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=zhao-cai", fail: function () {
      wx.showToast({ title: "招财 AR 打开失败", icon: "none" });
    } });
  },
  openNativeZiZaiExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=zi-zai", fail: function () {
      wx.showToast({ title: "自在 AR 打开失败", icon: "none" });
    } });
  },
  openNativeJinXiExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=jin-xi", fail: function () {
      wx.showToast({ title: "进喜 AR 打开失败", icon: "none" });
    } });
  },
  openNativeNaFuExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=na-fu", fail: function () {
      wx.showToast({ title: "纳福 AR 打开失败", icon: "none" });
    } });
  },
  openNativeBixiaExperience: function () {
    wx.navigateTo({ url: "/pages/ar-native-track/index?scene=bixia-yuanjun", fail: function () {
      wx.showToast({ title: "泰山老奶奶 AR 打开失败", icon: "none" });
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
