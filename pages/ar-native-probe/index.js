"use strict";
Page({
  data: {
    cameraMounted: false, cameraStatus: "未启动", frameStatus: "未检测",
    validFrames: 0, frameSize: "—", glStatus: "检测中"
  },
  onReady: function () {
    var self = this;
    wx.createSelectorQuery().in(this).select("#probe-gl").fields({ node: true, size: true }).exec(function (rows) {
      try {
        var canvas = rows && rows[0] && rows[0].node;
        if (!canvas) throw new Error("未取得 WebGL 画布节点");
        canvas.width = 240; canvas.height = 80;
        var gl = canvas.getContext("webgl");
        if (!gl) throw new Error("未取得 WebGL 上下文");
        gl.clearColor(0.12, 0.68, 0.35, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        var error = gl.getError();
        if (error !== gl.NO_ERROR) throw new Error("绘制错误 " + error);
        self.gl = gl;
        self.setData({ glStatus: "上下文与绘制指令正常，请确认绿色画布可见" });
      } catch (error) {
        self.setData({ glStatus: "未通过：" + error.message });
      }
    });
  },
  startCamera: function () {
    this.releaseFrames();
    this.validFrames = 0;
    this.lastFrameSize = "—";
    this.setData({ cameraMounted: true, cameraStatus: "等待授权及初始化", frameStatus: "等待相机就绪", validFrames: 0, frameSize: "—" });
  },
  onCameraReady: function () {
    if (!this.data.cameraMounted || this.listener) return;
    this.setData({ cameraStatus: "初始化完成，请确认预览实时变化" });
    var self = this;
    try {
      var context = wx.createCameraContext();
      if (!context || typeof context.onCameraFrame !== "function") throw new Error("当前客户端未提供 onCameraFrame");
      this.listener = context.onCameraFrame(function (frame) {
        if (!self.data.cameraMounted) return;
        if (frame.width > 0 && frame.height > 0 && frame.data && frame.data.byteLength === frame.width * frame.height * 4) {
          self.validFrames++;
          self.lastFrameSize = frame.width + " × " + frame.height;
        }
      });
      if (!this.listener || typeof this.listener.start !== "function") throw new Error("当前客户端未返回有效的帧监听器");
      this.setData({ frameStatus: "监听已请求，等待实际有效帧" });
      this.statsTimer = setInterval(function () {
        self.setData({ validFrames: self.validFrames, frameSize: self.lastFrameSize,
          frameStatus: self.validFrames > 0 ? "已收到 RGBA 帧，请确认帧数持续增长" : "未收到有效帧" });
      }, 1000);
      this.listener.start({ fail: function (error) {
        self.releaseFrames();
        self.setData({ frameStatus: "启动失败：" + (error.errMsg || "未知错误") });
      } });
    } catch (error) {
      this.releaseFrames();
      this.setData({ frameStatus: "未通过：" + error.message });
    }
  },
  releaseFrames: function () {
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.statsTimer = null;
    if (this.listener) {
      try { this.listener.stop(); } catch (_) {}
      this.listener = null;
    }
  },
  stopCamera: function () {
    this.releaseFrames();
    this.setData({ cameraMounted: false, cameraStatus: "已停止" });
  },
  onCameraError: function (event) {
    this.stopCamera();
    this.setData({ cameraStatus: "失败：" + ((event.detail && event.detail.errMsg) || "权限、设备或接口错误") });
  },
  onCameraStopped: function () { this.stopCamera(); },
  onHide: function () { this.stopCamera(); },
  onUnload: function () {
    this.releaseFrames();
    if (this.gl) {
      var ext = this.gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }
  }
});
