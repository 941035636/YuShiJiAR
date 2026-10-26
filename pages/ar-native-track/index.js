"use strict";
Page({
  data: { running:false,ready:false,status:"准备图像处理",matches:0,inliers:0,elapsedMs:0,previewHeight:360,modeName:"等待开始",previewFps:0,trackingFps:0,
    showModel:true,modelStatus:"等待画布就绪",modelFailed:false,modelScale:100,modelOffset:0,fov:50,renderMs:0,poseError:"—",poseStatus:"" },
  onLoad:function(){
    this.nextFrameAt=0;this.generation=0;
    // Register the page first so dependency failures remain visible to the user.
    try{
      var Tracker=require("./session-tracker.js").SessionTracker;
      this.Preview=require("./preview.js").Preview;
      var target=require("./target.js");
      this.tracker=new Tracker(target);
    }catch(error){
      console.error("本尊图片追踪初始化失败",error);
      this.setData({ready:false,status:"追踪初始化失败："+error.message});
    }
  },
  onReady:function(){
    if(!this.tracker||!this.Preview)return;
    var self=this;
    try{
      wx.createSelectorQuery().in(this).select("#frame-preview").fields({node:true,size:true}).exec(function(rows){
        if(self.destroyed)return;
        try{
          if(!rows||!rows[0]||!rows[0].node)throw new Error("无法获取预览画布");
          self.preview=new self.Preview(rows[0].node);self.previewWidth=rows[0].width;
          self.setData({ready:true,status:"已准备，请将本尊识别图放在另一台设备上显示"});
          self.loadModel();
        }catch(error){self.setData({status:"预览初始化失败："+error.message});}
      });
    }catch(error){self.setData({status:"预览初始化失败："+error.message});}
  },
  loadModel:function(){
    if(!this.preview||this.destroyed)return;
    try{
      if(this.preview.model)this.preview.model.dispose();
      var Renderer=require("./model-renderer.js").ModelRenderer,self=this;
      var model=new Renderer(this.preview.canvas,this.preview.gl,function(text,failed){
        if(!self.destroyed)self.setData({modelStatus:text,modelFailed:failed});
      });
      this.preview.model=model;this.applyModelSettings();model.load();
    }catch(error){this.setData({modelStatus:"模型初始化失败："+error.message,modelFailed:true});}
  },
  applyModelSettings:function(){
    if(!this.preview||!this.preview.model)return;
    var model=this.preview.model;model.enabled=this.data.showModel;model.scale=this.data.modelScale/100;
    model.offsetY=this.data.modelOffset/100;model.fov=this.data.fov;
  },
  toggleModel:function(){this.setData({showModel:!this.data.showModel});this.applyModelSettings();},
  setModelScale:function(event){this.setData({modelScale:Number(event.detail.value)});this.applyModelSettings();},
  setModelOffset:function(event){this.setData({modelOffset:Number(event.detail.value)});this.applyModelSettings();},
  setFov:function(event){this.setData({fov:Number(event.detail.value)});this.applyModelSettings();},
  start:function(){
    if(!this.preview)return;
    this.stop();this.generation++;this.nextFrameAt=0;this.nextPreviewAt=0;this.nextStatsAt=0;
    this.metricAt=Date.now();this.previewCount=0;this.trackingCount=0;this.lastResult=null;
    this.setData({running:true,status:"等待相机初始化",matches:0,inliers:0,elapsedMs:0,modeName:"首次识别",previewFps:0,trackingFps:0});
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
          var rgba=new Uint8Array(frame.data),result,changed=false;
          if(frameAt>=self.nextFrameAt){
            result=self.tracker.update(rgba,frame.width,frame.height,frameAt);
            changed=!self.lastResult||self.lastResult.found!==result.found||self.lastResult.mode!==result.mode;
            self.lastResult=result;self.resultAt=frameAt;self.trackingCount++;
            // Schedule from frame arrival, rather than adding a pause after computation.
            self.nextFrameAt=frameAt+(result.found||result.mode==="track"?80:400);
          }
          if(result||frameAt>=self.nextPreviewAt){
            // A recent estimate can bridge a skipped tracking frame, but never freeze indefinitely.
            var corners=self.lastResult&&frameAt-self.resultAt<=160?self.lastResult.corners:[];
            var drawAt=Date.now();self.preview.draw(rgba,frame.width,frame.height,corners);self.renderMs=Date.now()-drawAt;
            self.nextPreviewAt=Date.now()+50;self.previewCount++;
          }
          var shape=frame.width+":"+frame.height;
          if(self.frameShape!==shape){self.frameShape=shape;self.setData({previewHeight:Math.round(self.previewWidth*frame.height/frame.width)});}
          var now=Date.now(),metrics={};
          if(now-self.metricAt>=1000){
            metrics.previewFps=Math.round(self.previewCount*10000/(now-self.metricAt))/10;
            metrics.trackingFps=Math.round(self.trackingCount*10000/(now-self.metricAt))/10;
            self.metricAt=now;self.previewCount=0;self.trackingCount=0;
          }
          if(self.lastResult&&(changed||now>=self.nextStatsAt)){
            result=self.lastResult;
            metrics.status=result.found?"本帧定位到本尊，请检查绿框是否贴合":"未定位，请正对卡片并调整距离";
            metrics.modeName=result.mode==="track"?"连续追踪":"完整识别";
            metrics.matches=result.matches;metrics.inliers=result.inliers;metrics.elapsedMs=result.elapsedMs;
            metrics.renderMs=self.renderMs;metrics.poseError=typeof self.preview.poseError==="number"?self.preview.poseError:"—";
            metrics.poseStatus=self.preview.poseStatus||"";
            self.setData(metrics);self.nextStatsAt=now+500;
          }else if(typeof metrics.previewFps==="number"){self.setData(metrics);}
        }catch(error){self.stop();self.setData({status:"处理失败："+error.message});}
      });
      this.setData({status:"正在取帧，请对准本尊识别图"});
      this.listener.start({fail:function(error){if(self.generation!==generation)return;self.stop();self.setData({status:"取帧失败："+(error.errMsg||"未知错误")});}});
    }catch(error){this.stop();this.setData({status:error.message});}
  },
  stop:function(){
    this.generation++;
    if(this.listener){try{this.listener.stop();}catch(_){}this.listener=null;}
    if(this.tracker)this.tracker.reset();this.lastResult=null;
    this.setData({running:false,status:"追踪已停止"});
  },
  onCameraError:function(event){this.stop();this.setData({status:"相机失败："+((event.detail&&event.detail.errMsg)||"请检查相机权限")});},
  onCameraStopped:function(){if(this.data.running){this.stop();this.setData({status:"相机已中断，请重新开始"});}},
  onHide:function(){this.stop();},
  onUnload:function(){this.destroyed=true;this.stop();if(this.preview)this.preview.dispose();this.tracker=null;}
});
