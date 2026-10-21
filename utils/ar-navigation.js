"use strict";

function getPlatform() {
  try {
    if (typeof wx.getDeviceInfo === "function") {
      return String(wx.getDeviceInfo().platform || "").toLowerCase();
    }
    return String(wx.getSystemInfoSync().platform || "").toLowerCase();
  } catch (error) {
    console.warn("读取运行平台失败，将使用 XR-Frame 页面", error);
    return "";
  }
}

function isHarmonyPlatform(platform) {
  return platform === "ohos" || platform === "ohos_pc";
}

function openArScene(sceneKey, xrFramePage) {
  var platform = getPlatform();
  var url = isHarmonyPlatform(platform)
    ? "/pages/ar-harmony/index?scene=" + encodeURIComponent(sceneKey)
    : xrFramePage;

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
