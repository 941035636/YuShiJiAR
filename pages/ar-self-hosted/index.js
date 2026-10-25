"use strict";
var arConfig = require("../../config/self-hosted-ar.js");
Page({
  data: { url: "", message: "验证页面尚未配置" },
  onLoad: function (options) {
    var base = String(arConfig.baseUrl || "").trim();
    // The URL is developer-configured; arbitrary incoming URLs are never loaded.
    if (!/^https:\/\/[a-z0-9.-]+(?::443)?\//i.test(base) || /[?#\\]/.test(base)) {
      this.setData({ message: "请先由开发人员部署自有域名验证页并完成业务域名配置。" });
      return;
    }
    if (base.slice(-1) !== "/") base += "/";
    this.setData({ url: base + (options.mode === "ar" ? "index.html" : "probe.html") });
  },
  handleError: function () {
    this.setData({ url: "", message: "网页加载失败，请检查部署、业务域名和网络；当前测试尚未通过。" });
  }
});
