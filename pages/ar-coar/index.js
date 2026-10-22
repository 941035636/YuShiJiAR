"use strict";

var TEST_SCENE_ID = "1b578ca68a66422b810183d10361cac3";
var TEST_MARKER_URL = "https://coar.oss-cn-shenzhen.aliyuncs.com/app/common/image/image-ar-qingwa.jpg";

Page({
  data: {
    sceneId: TEST_SCENE_ID,
    markerUrl: TEST_MARKER_URL
  },

  startImageAr: function () {
    wx.navigateTo({
      url: "plugin://coar/coar-scene?sceneId=" + encodeURIComponent(this.data.sceneId),
      fail: function (error) {
        console.error("打开共创 AR 图片识别场景失败", error);
        wx.showModal({
          title: "共创 AR 打开失败",
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
        console.error("打开共创 AR 识别图失败", error);
        wx.showToast({ title: "识别图加载失败", icon: "none" });
      }
    });
  }
});
