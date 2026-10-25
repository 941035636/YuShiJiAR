"use strict";
const video = document.getElementById("camera");
const start = document.getElementById("start");
const stop = document.getElementById("stop");
const status = document.getElementById("status");
const report = document.getElementById("report");
let stream = null;
let run = 0;
const capabilities = {
  secureContext: window.isSecureContext,
  getUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
  webgl: false,
  webAssembly: typeof WebAssembly === "object",
  worker: typeof Worker === "function"
};
try {
  const gl = document.createElement("canvas").getContext("webgl");
  capabilities.webgl = !!gl;
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
} catch (_) {}
report.textContent = JSON.stringify(capabilities, null, 2);
function stopCamera() {
  run++;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  stop.disabled = true;
  start.disabled = false;
  status.textContent = "摄像头已停止";
}
start.addEventListener("click", async () => {
  const current = ++run;
  start.disabled = true;
  stop.disabled = false;
  try {
    if (!capabilities.secureContext || !capabilities.getUserMedia) {
      throw new Error("当前容器未提供安全的摄像头接口，尚不能采用内置网页 AR 路线。");
    }
    status.textContent = "等待相机授权…";
    const result = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    });
    if (current !== run) { result.getTracks().forEach(track => track.stop()); return; }
    stream = result;
    video.srcObject = stream;
    await video.play();
    if (current !== run) return;
    capabilities.videoWidth = video.videoWidth;
    capabilities.videoHeight = video.videoHeight;
    report.textContent = JSON.stringify(capabilities, null, 2);
    status.textContent = video.videoWidth > 0
      ? "摄像头已启动：确认画面实时变化。下一步测试图片追踪。"
      : "相机已授权，但没有有效视频帧，尚未通过。";
  } catch (error) {
    if (current !== run) return;
    stopCamera();
    status.textContent = "未通过：" + error.name + " — " + error.message;
  }
});
stop.addEventListener("click", stopCamera);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopCamera(); });
window.addEventListener("pagehide", stopCamera);
