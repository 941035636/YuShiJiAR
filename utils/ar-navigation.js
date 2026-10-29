"use strict";

function getPlatform() {
  try {
    if (typeof wx.getDeviceInfo === "function") {
      return String(wx.getDeviceInfo().platform || "").toLowerCase();
    }
    return String(wx.getSystemInfoSync().platform || "").toLowerCase();
  } catch (error) {
    console.warn("读取运行平台失败，将使用当前平台默认 AR 页面", error);
    return "";
  }
}

function isHarmonyPlatform(platform) {
  return platform === "ohos" || platform === "ohos_pc";
}

function openArScene(sceneKey, xrFramePage) {
  var platform = getPlatform();
  var harmonyPages = { "ben-zun": "/pages/ar-native-track/index?scene=ben-zun" };
  var url = xrFramePage;

  if (isHarmonyPlatform(platform)) {
    url = harmonyPages[sceneKey];
    if (!url) {
      wx.showModal({
        title: "鸿蒙适配中",
        content: "当前仅“本尊”场景已完成自研 AR 适配，该场景仍在迁移中。",
        showCancel: false
      });
      return;
    }
  }

  wx.navigateTo({
    url: url,
    fail: function (error) {
      console.error("打开 AR 场景失败", { platform: platform, sceneKey: sceneKey, error: error });
      wx.showToast({ title: "AR 场景打开失败", icon: "none" });
    }
  });
}

module.exports = {
  getPlatform: getPlatform,
  isHarmonyPlatform: isHarmonyPlatform,
  openArScene: openArScene
};
