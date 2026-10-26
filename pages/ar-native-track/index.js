"use strict";
Page({
  data: { running:false,ready:false,status:"准备图像处理",matches:0,inliers:0,elapsedMs:0,previewHeight:360 },
  onLoad:function(){
    this.nextFrameAt=0;this.generation=0;
    // Register the page first so dependency failures remain visible to the user.
    try{
      var Tracker=require("./tracker.js").Tracker;
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
        }catch(error){self.setData({status:"预览初始化失败："+error.message});}
      });
    }catch(error){self.setData({status:"预览初始化失败："+error.message});}
  },
  start:function(){
    if(!this.preview)return;
    this.stop();this.generation++;this.nextFrameAt=0;
    this.setData({running:true,status:"等待相机初始化",matches:0,inliers:0,elapsedMs:0});
  },
  onCameraReady:function(){
    if(!this.data.running||this.listener)return;
    var self=this,generation=this.generation;
    try{
      var camera=wx.createCameraContext();
      if(typeof camera.onCameraFrame!=="function")throw new Error("当前客户端无法取帧");
      this.listener=camera.onCameraFrame(function(frame){
        if(!self.data.running||self.generation!==generation||Date.now()<self.nextFrameAt)return;
        if(!frame.data||frame.data.byteLength!==frame.width*frame.height*4)return;
        try{
          var rgba=new Uint8Array(frame.data),result=self.tracker.detect(rgba,frame.width,frame.height);
          self.preview.draw(rgba,frame.width,frame.height,result.corners);
          var shape=frame.width+":"+frame.height;
          if(self.frameShape!==shape){self.frameShape=shape;self.setData({previewHeight:Math.round(self.previewWidth*frame.height/frame.width)});}
          self.setData({status:result.found?"本帧识别到本尊，请检查绿框是否贴合":"未定位，请正对卡片并调整距离",matches:result.matches,inliers:result.inliers,elapsedMs:result.elapsedMs});
          self.nextFrameAt=Date.now()+Math.max(250,result.elapsedMs);
        }catch(error){self.stop();self.setData({status:"处理失败："+error.message});}
      });
      this.setData({status:"正在取帧，请对准本尊识别图"});
      this.listener.start({fail:function(error){if(self.generation!==generation)return;self.stop();self.setData({status:"取帧失败："+(error.errMsg||"未知错误")});}});
    }catch(error){this.stop();this.setData({status:error.message});}
  },
  stop:function(){
    this.generation++;
    if(this.listener){try{this.listener.stop();}catch(_){}this.listener=null;}
    this.setData({running:false,status:"追踪已停止"});
  },
  onCameraError:function(event){this.stop();this.setData({status:"相机失败："+((event.detail&&event.detail.errMsg)||"请检查相机权限")});},
  onCameraStopped:function(){if(this.data.running){this.stop();this.setData({status:"相机已中断，请重新开始"});}},
  onHide:function(){this.stop();},
  onUnload:function(){this.destroyed=true;this.stop();if(this.preview)this.preview.dispose();this.tracker=null;}
});
