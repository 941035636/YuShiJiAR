"use strict";
Page({
  data: { running:false,ready:false,status:"准备图像处理",matches:0,inliers:0,elapsedMs:0,previewHeight:360,frameSize:"—",modeName:"等待开始",previewFps:0,trackingFps:0,stabilityMode:"等待定位",
    showModel:true,modelStatus:"等待画布就绪",modelFailed:false,modelScale:100,modelOffset:0,fov:50,renderMs:0,poseError:"—",poseStatus:"",
    showEffects:true,effectsStatus:"等待主模型就绪",effectsFailed:false,soundEnabled:true,audioStatus:"等待初始化声音",
    runtimeAppId:"未读取",runtimeEnv:"未读取",modelStage:"等待下载",diagnosticsRevision:"20261028-experience-1",diagnosticNotice:"",
    modelReady:false,effectsLoading:false,experienceError:"",audioFailed:false,
    quality:"balanced",renderSize:"—",aaMode:"等待绘制",aaError:"",
    debug:false,variantKey:"reference",variantLabel:"原版对照素材",renderMode:"pbr",pbrAvailable:false,exposure:1,effectExposure:1.8,
    exposurePercent:100,effectPercent:180,stageHeight:667,canvasWidth:500,canvasHeight:667,canvasLeft:-62.5,canvasTop:0,sceneVisible:false },
  onLoad:function(){
    this.nextFrameAt=0;this.generation=0;
    try{
      var account=wx.getAccountInfoSync().miniProgram;
      this.runtimeVersion=account.version||"";
      this.setData({runtimeAppId:account.appId||"未提供",runtimeEnv:account.envVersion||"未提供"});
    }catch(_){}
    try{
      this.visualSettings=require("./visual-settings.js");
      // Formal experience pins the accepted code defaults, not per-device debug caches.
      this.setData(this.visualSettings.sanitize(this.visualSettings.defaults));
      var windowInfo;
      try{windowInfo=typeof wx.getWindowInfo==="function"?wx.getWindowInfo():wx.getSystemInfoSync();}catch(_){}
      this.windowWidth=windowInfo&&windowInfo.windowWidth||375;this.windowHeight=windowInfo&&windowInfo.windowHeight||667;
      this.pixelRatio=windowInfo&&windowInfo.pixelRatio||1;
      this.refreshViewport();
    }catch(_){}
    // Register the page first so dependency failures remain visible to the user.
    try{
      var Tracker=require("./session-tracker.js").SessionTracker;
      var Stabilizer=require("./stabilizer.js").TrackingStabilizer;
      this.Preview=require("./preview.js").Preview;
      var target=require("./target.js");
      this.tracker=new Tracker(target);
      this.stabilizer=new Stabilizer({holdMs:170});
    }catch(error){
      console.error("本尊图片追踪初始化失败",error);
      this.setData({ready:false,status:"追踪初始化失败："+error.message,experienceError:"体验准备失败，请返回后重试"});
    }
    try{
      var AudioController=require("./audio.js").AudioController,self=this;
      this.audio=new AudioController(function(text){if(!self.destroyed)self.setData({audioStatus:text,audioFailed:/失败/.test(text)});});
    }catch(error){this.setData({audioStatus:"音频初始化失败："+error.message,audioFailed:true});}
  },
  onReady:function(){
    if(!this.tracker||!this.Preview)return;
    var self=this;
    try{
      wx.createSelectorQuery().in(this).select("#frame-preview").fields({node:true,size:true}).exec(function(rows){
        if(self.destroyed)return;
        try{
          if(!rows||!rows[0]||!rows[0].node)throw new Error("无法获取预览画布");
          self.preview=new self.Preview(rows[0].node);self.previewWidth=self.windowWidth||rows[0].width;
          self.preview.showOutline=false;
          self.refreshViewport();
          self.setData({ready:true,status:"已准备，请将本尊识别图放在另一台设备上显示"});
          self.loadModel();
        }catch(error){self.setData({status:"预览初始化失败："+error.message,experienceError:"画面准备失败，请返回后重试"});}
      });
    }catch(error){self.setData({status:"预览初始化失败："+error.message,experienceError:"画面准备失败，请返回后重试"});}
  },
  loadModel:function(){
    if(!this.preview||this.destroyed)return;
    this.setData({modelReady:false,modelFailed:false,effectsLoading:false,effectsFailed:false});
    try{
      if(this.preview.model)this.preview.model.dispose();
      var Renderer=require("./model-renderer.js").ModelRenderer,self=this;
      var model=new Renderer(this.preview.canvas,this.preview.gl,function(text,failed,detail){
        self.modelLoadDetail=detail||{};
        if(!self.destroyed)self.setData({modelStatus:text,modelFailed:failed,modelStage:detail&&detail.stage||"未知阶段",pbrAvailable:!!(detail&&detail.pbrAvailable),modelReady:!!(self.preview&&self.preview.model&&self.preview.model.ready)});
        if(!failed&&self.preview&&self.preview.model&&self.preview.model.ready)self.loadEffects();
      },{variantKey:this.data.variantKey});
      this.preview.model=model;this.applyModelSettings();model.load();
    }catch(error){this.setData({modelStatus:"模型初始化失败："+error.message,modelFailed:true});}
  },
  refreshViewport:function(){
    if(!this.visualSettings)return;
    var layout=this.visualSettings.layout(this.frameWidth,this.frameHeight,this.windowWidth,this.windowHeight,false);
    var config=require("./model-config.js");
    layout.variantLabel=config.variants[this.data.variantKey].label;
    layout.exposurePercent=Math.round(this.data.exposure*100);layout.effectPercent=Math.round(this.data.effectExposure*100);this.setData(layout);
    if(this.preview){this.preview.displayWidth=layout.canvasWidth;this.preview.pixelRatio=this.pixelRatio||1;this.preview.quality=this.data.quality;}
  },
  toggleRunning:function(){if(this.data.running)this.stop();else if(this.data.ready)this.start();},
  selectVariant:function(event){
    var key=event.currentTarget.dataset.variant,config=require("./model-config.js");
    if(!config.variants[key]||key===this.data.variantKey)return;
    this.stop();this.setData({variantKey:key,effectsStatus:"等待主模型就绪",effectsFailed:false});this.saveVisualSettings();this.loadModel();
  },
  toggleMaterial:function(){this.setData({renderMode:this.data.renderMode==="pbr"?"simple":"pbr"});this.saveVisualSettings();},
  setQuality:function(event){
    var quality=event.currentTarget.dataset.quality;if(["performance","balanced","high"].indexOf(quality)<0)return;
    this.setData({quality:quality});if(this.preview)this.preview.aaError="";this.saveVisualSettings();
  },
  setExposure:function(event){this.setData({exposure:Number(event.detail.value)/100});this.saveVisualSettings();},
  setEffectExposure:function(event){this.setData({effectExposure:Number(event.detail.value)/100});this.saveVisualSettings();},
  saveVisualSettings:function(){
    if(this.visualSettings){var settings=this.visualSettings.sanitize(this.data);this.setData(settings);try{wx.setStorageSync(this.visualSettings.storageKey,settings);}catch(_){}}
    this.refreshViewport();this.applyModelSettings();
  },
  resetVisualSettings:function(){this.stop();if(this.visualSettings)this.setData(this.visualSettings.defaults);this.saveVisualSettings();this.loadModel();},
  onResize:function(event){var size=event.size||{};this.windowWidth=size.windowWidth||this.windowWidth;this.windowHeight=size.windowHeight||this.windowHeight;this.refreshViewport();},
  copyLoadDiagnostics:function(){
    var self=this;
    var diagnostic={revision:this.data.diagnosticsRevision,appId:this.data.runtimeAppId,envVersion:this.data.runtimeEnv,
      version:this.runtimeVersion||"",stage:this.data.modelStage,status:this.data.modelStatus,download:this.modelLoadDetail||{},
      visual:this.visualSettings?this.visualSettings.sanitize(this.data):{},frameSize:this.data.frameSize,
      previewFps:this.data.previewFps,trackingFps:this.data.trackingFps,poseError:this.data.poseError,
      renderSize:this.preview&&this.preview.renderSize,antialias:this.preview&&this.preview.aaMode,antialiasError:this.preview&&this.preview.aaError};
    try{wx.setClipboardData({data:JSON.stringify(diagnostic,null,2),
      success:function(){if(!self.destroyed)self.setData({diagnosticNotice:"加载诊断已复制，可粘贴反馈"});},
      fail:function(){if(!self.destroyed)self.setData({diagnosticNotice:"复制失败，请截图上方 AppID 和加载状态"});}
    });}catch(_){this.setData({diagnosticNotice:"复制失败，请截图上方 AppID 和加载状态"});}
  },
  loadEffects:function(){
    if(!this.preview||!this.preview.model||this.destroyed)return;
    var self=this;this.preview.model.loadEffects(function(text,failed){if(!self.destroyed)self.setData({effectsStatus:text,effectsFailed:failed,effectsLoading:!!self.preview.model.effectsLoading});});
  },
  applyModelSettings:function(){
    if(!this.preview||!this.preview.model)return;
    var model=this.preview.model;model.enabled=this.data.showModel;model.scale=this.data.modelScale/100;
    model.offsetY=this.data.modelOffset/100;model.fov=this.data.fov;model.effectsEnabled=this.data.showEffects;
    model.materialMode=this.data.renderMode==="pbr"?1:0;model.exposure=this.data.exposure;model.effectExposure=this.data.effectExposure;
    if(!this.data.showModel&&this.audio)this.audio.setTracked(false);
  },
  toggleModel:function(){this.setData({showModel:!this.data.showModel});this.applyModelSettings();},
  toggleEffects:function(){this.setData({showEffects:!this.data.showEffects});this.applyModelSettings();},
  toggleSound:function(){this.setData({soundEnabled:!this.data.soundEnabled});if(this.audio)this.audio.setEnabled(this.data.soundEnabled);},
  replayNarration:function(){if(this.audio)this.audio.replay();},
  setModelScale:function(event){this.setData({modelScale:Number(event.detail.value)});this.saveVisualSettings();},
  setModelOffset:function(event){this.setData({modelOffset:Number(event.detail.value)});this.saveVisualSettings();},
  setFov:function(event){this.setData({fov:Number(event.detail.value)});this.saveVisualSettings();},
  start:function(){
    if(!this.preview)return;
    this.stop();this.generation++;this.nextFrameAt=0;this.nextPreviewAt=0;this.nextStatsAt=0;
    this.metricAt=Date.now();this.previewCount=0;this.trackingCount=0;this.lastResult=null;
    if(this.stabilizer)this.stabilizer.reset();
    this.setData({running:true,experienceError:"",status:"等待相机初始化",matches:0,inliers:0,elapsedMs:0,modeName:"首次识别",previewFps:0,trackingFps:0,stabilityMode:"等待定位"});
  },
  onCameraReady:function(){
    if(!this.data.running||this.listener)return;
    var self=this,generation=this.generation;
    try{
      var camera=wx.createCameraContext();
      if(typeof camera.onCameraFrame!=="function")throw new Error("当前客户端无法取帧");
      this.listener=camera.onCameraFrame(function(frame){
        if(!self.data.running||self.generation!==generation)return;
        if(!frame.data||frame.data.byteLength!==frame.width*frame.height*4)return;
        var frameAt=Date.now();
        if(frameAt<self.nextFrameAt&&frameAt<self.nextPreviewAt)return;
        try{
          var rgba=new Uint8Array(frame.data),result,rawResult,changed=false;
          if(frameAt>=self.nextFrameAt){
            rawResult=self.tracker.update(rgba,frame.width,frame.height,frameAt);
            result=self.stabilizer?self.stabilizer.update(rawResult,frameAt):rawResult;
            changed=!self.lastResult||self.lastResult.found!==result.found||self.lastResult.mode!==result.mode;
            self.lastResult=result;self.resultAt=frameAt;self.trackingCount++;
            // Back pressure follows the actual cost. Stable tracking stays responsive,
            // while descriptor search cannot monopolize the logic thread.
            var interval=rawResult.found||rawResult.mode==="track"?Math.max(66,rawResult.elapsedMs*1.08):Math.max(280,rawResult.elapsedMs*1.45);
            self.nextFrameAt=frameAt+interval;
          }
          if(result||frameAt>=self.nextPreviewAt){
            // The stabilizer bridges one noisy/missing result, but never freezes indefinitely.
            var corners=self.lastResult&&frameAt-self.resultAt<=220?self.lastResult.corners:[];
            var drawAt=Date.now();self.preview.draw(rgba,frame.width,frame.height,corners);self.renderMs=Date.now()-drawAt;
            if(self.audio)self.audio.setTracked(!!self.preview.sceneVisible);
            self.nextPreviewAt=frameAt+Math.max(40,self.renderMs*1.1);self.previewCount++;
          }
          var shape=frame.width+":"+frame.height;
          if(self.frameShape!==shape){self.frameShape=shape;self.frameWidth=frame.width;self.frameHeight=frame.height;self.setData({previewHeight:Math.round(self.previewWidth*frame.height/frame.width),frameSize:frame.width+"×"+frame.height});self.refreshViewport();}
          var now=Date.now(),metrics={};
          if(now-self.metricAt>=1000){
            metrics.previewFps=Math.round(self.previewCount*10000/(now-self.metricAt))/10;
            metrics.trackingFps=Math.round(self.trackingCount*10000/(now-self.metricAt))/10;
            self.metricAt=now;self.previewCount=0;self.trackingCount=0;
          }
          if(self.lastResult&&(changed||now>=self.nextStatsAt)){
            result=self.lastResult;
            metrics.status=result.held?"短时保持上一姿态，正在重新确认目标":result.found?"本帧定位到本尊，请检查绿框是否贴合":"未定位，请正对卡片并调整距离";
            metrics.modeName=result.mode==="track"?"连续追踪":"完整识别";
            metrics.stabilityMode=result.stabilityMode||"原始定位";
            metrics.matches=result.matches;metrics.inliers=result.inliers;metrics.elapsedMs=result.elapsedMs;
            metrics.renderMs=self.renderMs;metrics.poseError=typeof self.preview.poseError==="number"?self.preview.poseError:"—";
            metrics.poseStatus=self.preview.poseStatus||"";
            metrics.renderSize=self.preview.renderSize||"—";metrics.aaMode=self.preview.aaMode||"未启用";metrics.aaError=self.preview.aaError||"";
            metrics.sceneVisible=!!self.preview.sceneVisible;
            self.setData(metrics);self.nextStatsAt=now+750;
          }else if(typeof metrics.previewFps==="number"){self.setData(metrics);}
        }catch(error){self.stop();self.setData({status:"处理失败："+error.message,experienceError:"体验暂时中断，请重新开始"});}
      });
      this.setData({status:"正在取帧，请对准本尊识别图"});
      this.listener.start({fail:function(error){if(self.generation!==generation)return;self.stop();self.setData({status:"取帧失败："+(error.errMsg||"未知错误"),experienceError:"相机暂时无法使用，请重新开始"});}});
    }catch(error){this.stop();this.setData({status:error.message,experienceError:"相机暂时无法使用，请重新开始"});}
  },
  stop:function(){
    this.generation++;
    if(this.listener){try{this.listener.stop();}catch(_){}this.listener=null;}
    if(this.tracker)this.tracker.reset();if(this.stabilizer)this.stabilizer.reset();this.lastResult=null;
    if(this.audio)this.audio.reset();
    if(this.preview&&this.preview.model)this.preview.model.resetTimeline();
    this.setData({running:false,sceneVisible:false,status:"追踪已停止"});
  },
  onCameraError:function(event){this.stop();this.setData({status:"相机失败："+((event.detail&&event.detail.errMsg)||"请检查相机权限"),experienceError:"无法使用相机，请检查微信相机权限后重试"});},
  onCameraStopped:function(){if(this.data.running){this.stop();this.setData({status:"相机已中断，请重新开始",experienceError:"相机已中断，请重新开始"});}},
  onHide:function(){this.stop();},
  onUnload:function(){this.destroyed=true;this.stop();if(this.audio)this.audio.dispose();if(this.preview)this.preview.dispose();this.tracker=null;}
});
