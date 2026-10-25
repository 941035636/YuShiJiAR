"use strict";
// MindAR marker coordinates differ from the original XR-Frame/CoAR coordinates.
// These transforms are initial POC values and must be calibrated on a real card.
AFRAME.registerComponent("fit-model", {
  schema: { width: { default: 1 } },
  init: function () {
    this.el.addEventListener("model-loaded", () => {
      const mesh = this.el.getObject3D("mesh");
      this.el.object3D.updateWorldMatrix(true, true);
      const box = new AFRAME.THREE.Box3().setFromObject(mesh)
        .applyMatrix4(this.el.object3D.matrixWorld.clone().invert());
      const size = box.getSize(new AFRAME.THREE.Vector3());
      const center = box.getCenter(new AFRAME.THREE.Vector3());
      const factor = this.data.width / Math.max(size.x, 0.0001);
      mesh.position.sub(center);
      this.el.object3D.scale.setScalar(factor);
      this.mixer = new AFRAME.THREE.AnimationMixer(mesh);
      (mesh.animations || []).forEach(clip => this.mixer.clipAction(clip).play());
    });
  },
  tick: function (_, delta) { if (this.mixer && document.querySelector("#target").object3D.visible) this.mixer.update(delta / 1000); },
  remove: function () { this.mixer?.stopAllAction(); }
});
window.addEventListener("DOMContentLoaded", () => {
  const scene = document.querySelector("a-scene");
  const target = document.querySelector("#target");
  const status = document.querySelector("#status");
  const start = document.querySelector("#start");
  const audioButton = document.querySelector("#audio-toggle");
  const narration = document.querySelector("#narration");
  let audioEnabled = false, tracked = false, running = false;
  const playNarration = () => {
    if (audioEnabled && tracked && running) narration.play().catch(() => { status.textContent = "如需讲解，请点击开启讲解。"; });
  };
  function pause() { narration.pause(); }
  const ready = () => { start.disabled = false; };
  if (scene.hasLoaded) ready(); else scene.addEventListener("loaded", ready, { once: true });
  scene.addEventListener("model-error", () => { status.textContent = "模型加载失败，请检查同域素材是否部署完整。"; });
  start.addEventListener("click", async () => {
    start.disabled = true;
    try {
      const response = await fetch("./assets/tssgd.mind", { method: "HEAD" });
      if (!response.ok) throw new Error("识别目标尚未编译，请先在电脑上完成 compile.html 的操作。");
      await scene.systems["mindar-image-system"].start();
      running = true;
      status.textContent = "摄像头已启动，请对准本尊识别图。";
    } catch (error) {
      status.textContent = "启动未成功：" + (error?.message || String(error));
      start.disabled = false;
    }
  });
  target.addEventListener("targetFound", () => { tracked = true; status.textContent = "已识别本尊"; playNarration(); });
  target.addEventListener("targetLost", () => { tracked = false; status.textContent = "请重新对准识别图"; pause(); });
  audioButton.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    audioButton.textContent = audioEnabled ? "关闭讲解" : "开启讲解";
    if (audioEnabled) playNarration(); else pause();
  });
  document.querySelector("#effects").addEventListener("click", event => {
    event.target.disabled = true;
    [["dun", 1, "0 0 0.1"], ["shan", 1.8, "0 0.6 -0.2"], ["sgd", 0.5, "0 0.6 0.2"], ["dcdy02", 1.5, "0 -0.2 0"]].forEach(([name, width, position]) => {
      const entity = document.createElement("a-entity");
      entity.setAttribute("rotation", "90 0 0");
      entity.setAttribute("position", position);
      entity.setAttribute("gltf-model", "./assets/" + name + ".glb");
      entity.setAttribute("fit-model", "width: " + width);
      document.querySelector("#effects-root").appendChild(entity);
    });
    status.textContent = "正在加载特效，位置与大小需要真机校准。";
  });
  function stop() {
    if (running) { scene.systems["mindar-image-system"].stop(); running = false; }
    tracked = false;
    pause();
    start.disabled = false;
  }
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
});
