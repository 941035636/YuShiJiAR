"use strict";
var parse=require("./glb.js").parse;
var pose=require("./pose.js");
var config=require("./model-config.js");
function compile(gl,type,source){
  var shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){var error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}
  return shader;
}
function ModelRenderer(canvas,gl,onState){
  this.canvas=canvas;this.gl=gl;this.onState=onState;this.parts=[];this.files={};
  this.enabled=true;this.ready=false;this.fov=config.fov;this.scale=1;this.offsetY=0;
  this.stamp=Date.now()+"-"+Math.floor(Math.random()*1000000);
}
ModelRenderer.prototype.state=function(text,failed){if(!this.disposed)this.onState(text,!!failed);};
ModelRenderer.prototype.load=function(){
  var self=this,progress=-1;
  this.state("正在下载墨玉模型（约 8.7 MB）");
  this.task=wx.downloadFile({url:config.url,timeout:60000,
    success:function(response){
      self.task=null;if(self.disposed)return;
      if(response.statusCode!==200){self.state("模型下载失败：HTTP "+response.statusCode,true);return;}
      self.state("正在解析墨玉模型和贴图");
      try{wx.getFileSystemManager().readFile({filePath:response.tempFilePath,success:function(result){
        if(self.disposed)return;
        try{
          var model=parse(result.data,config);self.build(model).then(function(){
            if(self.disposed)return;self.ready=true;self.state("墨玉模型已就绪，识别后显示");
          }).catch(function(error){self.fail(error);});
        }catch(error){self.fail(error);}
      },fail:function(error){self.fail(new Error(error.errMsg||"读取模型失败"));}});}catch(error){self.fail(error);}
    },fail:function(error){self.task=null;self.fail(new Error(error.errMsg||"模型下载失败，请检查网络及 downloadFile 合法域名"));}
  });
  if(this.task&&this.task.onProgressUpdate)this.task.onProgressUpdate(function(event){
    var step=Math.floor(event.progress/10)*10;
    if(self.task&&step!==progress){progress=step;self.state("正在下载墨玉模型 "+event.progress+"%");}
  });
};
ModelRenderer.prototype.fail=function(error){
  if(this.disposed)return;
  this.ready=false;this.releaseGpu();this.state("墨玉模型加载失败："+error.message,true);
};
ModelRenderer.prototype.texture=function(image,texture){
  var self=this,gl=this.gl;
  if(!image){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));return Promise.resolve();}
  return new Promise(function(resolve,reject){
    var fs=wx.getFileSystemManager(),filename=wx.env.USER_DATA_PATH+"/ysj-native-"+self.stamp+"-"+image.index+(image.mimeType==="image/png"?".png":".jpg");
    self.files[filename]=true;
    function remove(){fs.unlink({filePath:filename,complete:function(){delete self.files[filename];}});}
    fs.writeFile({filePath:filename,data:image.bytes,success:function(){
      if(self.disposed){remove();reject(new Error("页面已关闭"));return;}
      var img;
      try{img=self.canvas.createImage();}catch(error){remove();reject(error);return;}
      img.onload=function(){
        img.onload=null;img.onerror=null;
        if(self.disposed){remove();reject(new Error("页面已关闭"));return;}
        try{
          if(Math.max(img.width,img.height)>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error("贴图超过设备支持的尺寸");
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
          var error=gl.getError();if(error!==gl.NO_ERROR)throw new Error("贴图上传错误 "+error);
          remove();resolve();
        }catch(error){remove();reject(error);}
      };
      img.onerror=function(){img.onload=null;img.onerror=null;remove();reject(new Error("无法解码模型贴图"));};
      try{img.src=filename;}catch(error){img.onload=null;img.onerror=null;remove();reject(error);}
    },fail:function(error){delete self.files[filename];reject(new Error(error.errMsg||"写入模型贴图失败"));}});
  });
};
ModelRenderer.prototype.build=function(model){
  var gl=this.gl,self=this;
  var vertex=compile(gl,gl.VERTEX_SHADER,"attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 mvp;uniform mat3 rotation;uniform float size;uniform float shiftY;varying vec2 tex;varying vec3 n;void main(){vec3 p=position*size;p.y+=shiftY;gl_Position=mvp*vec4(p,1.);tex=uv;n=rotation*normal;}");
  var fragment;
  try{fragment=compile(gl,gl.FRAGMENT_SHADER,"precision mediump float;uniform sampler2D colorMap;uniform vec4 color;varying vec2 tex;varying vec3 n;void main(){vec3 base=pow(max(texture2D(colorMap,tex).rgb*color.rgb,vec3(0.)),vec3(2.2));float light=.75+.25*max(dot(normalize(n),normalize(vec3(-.3,-.5,-1.))),0.);gl_FragColor=vec4(pow(base*light,vec3(1./2.2)),1.);}");}
  catch(error){gl.deleteShader(vertex);throw error;}
  this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.attributes={position:gl.getAttribLocation(this.program,"position"),normal:gl.getAttribLocation(this.program,"normal"),uv:gl.getAttribLocation(this.program,"uv")};
  this.uniforms={};["mvp","rotation","size","shiftY","colorMap","color"].forEach(function(name){self.uniforms[name]=gl.getUniformLocation(self.program,name);});
  return model.primitives.reduce(function(promise,part){return promise.then(function(){
    if(self.disposed)throw new Error("页面已关闭");
    var gpu={vertex:gl.createBuffer(),index:gl.createBuffer(),texture:gl.createTexture(),count:part.indices.length,color:part.color,doubleSided:part.doubleSided};self.parts.push(gpu);
    gpu.type=part.indices.BYTES_PER_ELEMENT===2?gl.UNSIGNED_SHORT:gl.UNSIGNED_INT;
    if(gpu.type===gl.UNSIGNED_INT&&!gl.getExtension("OES_element_index_uint"))throw new Error("设备不支持模型索引格式");
    gl.bindBuffer(gl.ARRAY_BUFFER,gpu.vertex);gl.bufferData(gl.ARRAY_BUFFER,part.vertices,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,part.indices,gl.STATIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return self.texture(part.image,gpu.texture);
  });},Promise.resolve());
};
ModelRenderer.prototype.draw=function(corners,width,height,aspect){
  if(!this.enabled||!this.ready||this.disposed)return null;
  var transform=pose.solve(corners,width,height,aspect,this.fov);if(!transform)return null;
  var gl=this.gl,u=this.uniforms,a=this.attributes,m=transform.view;
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.frontFace(gl.CCW);gl.cullFace(gl.BACK);
  gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  gl.uniformMatrix4fv(u.mvp,false,transform.mvp);gl.uniformMatrix3fv(u.rotation,false,new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]));
  gl.uniform1f(u.size,this.scale);gl.uniform1f(u.shiftY,this.offsetY);gl.uniform1i(u.colorMap,0);
  for(var i=0;i<this.parts.length;i++){
    var part=this.parts[i];if(part.doubleSided)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER,part.vertex);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.index);
    gl.enableVertexAttribArray(a.position);gl.vertexAttribPointer(a.position,3,gl.FLOAT,false,32,0);
    gl.enableVertexAttribArray(a.normal);gl.vertexAttribPointer(a.normal,3,gl.FLOAT,false,32,12);
    gl.enableVertexAttribArray(a.uv);gl.vertexAttribPointer(a.uv,2,gl.FLOAT,false,32,24);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,part.texture);gl.uniform4fv(u.color,part.color);
    gl.drawElements(gl.TRIANGLES,part.count,part.type,0);
  }
  gl.disableVertexAttribArray(a.position);gl.disableVertexAttribArray(a.normal);gl.disableVertexAttribArray(a.uv);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  return transform;
};
ModelRenderer.prototype.releaseGpu=function(){
  var gl=this.gl;this.parts.forEach(function(p){gl.deleteBuffer(p.vertex);gl.deleteBuffer(p.index);gl.deleteTexture(p.texture);});this.parts=[];
  if(this.program){gl.deleteProgram(this.program);this.program=null;}
};
ModelRenderer.prototype.dispose=function(){
  this.disposed=true;this.ready=false;if(this.task){this.task.abort();this.task=null;}this.releaseGpu();
  var fs=wx.getFileSystemManager(),self=this;Object.keys(this.files).forEach(function(file){fs.unlink({filePath:file,complete:function(){delete self.files[file];}});});
  // Keep late image callbacks alive: they observe disposed and release their files.
};
module.exports={ModelRenderer:ModelRenderer};
