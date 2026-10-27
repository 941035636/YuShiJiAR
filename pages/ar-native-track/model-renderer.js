"use strict";
var parse=require("./glb.js").parse;
var pose=require("./pose.js");
var config=require("./model-config.js");
var effectsConfig=require("./effects-config.js");
var animation=require("./animation.js");
var glb=require("./glb.js");
function effectRoot(alignment,definition){
  var s=definition.scale,p=definition.position,k=0.054;
  return pose.multiply(alignment,new Float32Array([s[0]/k,0,0,0,0,s[1]/k,0,0,0,0,s[2]/k,0,p[0]/k,-(p[2]-0.5)/k,(p[1]+0.5)/k,1]));
}
function compile(gl,type,source){
  var shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){var error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}
  return shader;
}
function ModelRenderer(canvas,gl,onState){
  this.canvas=canvas;this.gl=gl;this.onState=onState;this.parts=[];this.files={};
  this.enabled=true;this.ready=false;this.fov=config.fov;this.scale=1;this.offsetY=0;
  this.effectsEnabled=true;this.effectGroups=[];this.effectTasks=[];this.clock=new animation.Clock();
  this.identityMatrix=glb.identity();this.identityNormal=new Float32Array([1,0,0,0,1,0,0,0,1]);this.rotationNormal=new Float32Array(9);this.drawList=[];
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
ModelRenderer.prototype.texture=function(image,texture,group){
  var self=this,gl=this.gl;
  if(!image){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));return Promise.resolve();}
  return new Promise(function(resolve,reject){
    var fs=wx.getFileSystemManager(),filename=wx.env.USER_DATA_PATH+"/ysj-native-"+self.stamp+"-"+(group||"base")+"-"+image.index+(image.mimeType==="image/png"?".png":".jpg");
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
  var vertex=compile(gl,gl.VERTEX_SHADER,"attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 mvp;uniform mat4 local;uniform mat3 rotation;uniform mat3 localNormal;uniform float size;uniform float shiftY;varying vec2 tex;varying vec3 n;void main(){vec3 p=(local*vec4(position,1.)).xyz*size;p.y+=shiftY;gl_Position=mvp*vec4(p,1.);tex=uv;n=rotation*localNormal*normal;}");
  var fragment;
  try{fragment=compile(gl,gl.FRAGMENT_SHADER,"precision mediump float;uniform sampler2D colorMap;uniform vec4 color;uniform vec2 repeatUV;uniform float unlit;uniform float transparent;varying vec2 tex;varying vec3 n;void main(){vec2 uv=mix(clamp(tex,0.,1.),fract(tex),repeatUV);vec4 sampleColor=texture2D(colorMap,uv);float alpha=mix(1.,sampleColor.a*color.a,transparent);if(alpha<.003)discard;vec3 base=pow(max(sampleColor.rgb,vec3(0.)),vec3(2.2))*color.rgb;float light=mix(.75+.25*max(dot(normalize(n),normalize(vec3(-.3,-.5,-1.))),0.),1.,unlit);gl_FragColor=vec4(pow(base*light,vec3(1./2.2)),alpha);}");}
  catch(error){gl.deleteShader(vertex);throw error;}
  this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.attributes={position:gl.getAttribLocation(this.program,"position"),normal:gl.getAttribLocation(this.program,"normal"),uv:gl.getAttribLocation(this.program,"uv")};
  this.uniforms={};["mvp","local","localNormal","rotation","size","shiftY","colorMap","color","repeatUV","transparent","unlit"].forEach(function(name){self.uniforms[name]=gl.getUniformLocation(self.program,name);});
  this.alignment=model.alignment;
  return this.uploadParts(model.primitives,"base");
};
ModelRenderer.prototype.uploadParts=function(primitives,group){
  var gl=this.gl,self=this;
  return primitives.reduce(function(promise,part){return promise.then(function(){
    if(self.disposed)throw new Error("页面已关闭");
    var center=[0,0,0],count=part.vertices.length/8;
    for(var i=0;i<part.vertices.length;i+=8)for(var k=0;k<3;k++)center[k]+=part.vertices[i+k]/count;
    var gpu={vertex:gl.createBuffer(),index:gl.createBuffer(),texture:gl.createTexture(),count:part.indices.length,color:part.color,doubleSided:part.doubleSided,
      center:center,node:part.node,group:group,transparent:part.transparent,wrap:[part.wrapS===10497?1:0,part.wrapT===10497?1:0]};self.parts.push(gpu);
    gpu.type=part.indices.BYTES_PER_ELEMENT===2?gl.UNSIGNED_SHORT:gl.UNSIGNED_INT;
    if(gpu.type===gl.UNSIGNED_INT&&!gl.getExtension("OES_element_index_uint"))throw new Error("设备不支持模型索引格式");
    gl.bindBuffer(gl.ARRAY_BUFFER,gpu.vertex);gl.bufferData(gl.ARRAY_BUFFER,part.vertices,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,part.indices,gl.STATIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return self.texture(part.image,gpu.texture,group);
  });},Promise.resolve());
};
ModelRenderer.prototype.readEffect=function(definition){
  var self=this;
  return new Promise(function(resolve,reject){
    var task=wx.downloadFile({url:definition.url,timeout:60000,success:function(response){
      self.effectTasks=self.effectTasks.filter(function(value){return value!==task;});
      if(self.disposed){reject(new Error("页面已关闭"));return;}
      if(response.statusCode!==200){reject(new Error("HTTP "+response.statusCode));return;}
      try{wx.getFileSystemManager().readFile({filePath:response.tempFilePath,success:function(value){
        if(self.disposed){reject(new Error("页面已关闭"));return;}
        try{resolve(parse(value.data,{maxBytes:config.maxBytes,effect:true}));}catch(error){reject(error);}
      },fail:function(error){reject(new Error(error.errMsg||"读取特效失败"));}});}catch(error){reject(error);}
    },fail:function(error){self.effectTasks=self.effectTasks.filter(function(value){return value!==task;});reject(new Error(error.errMsg||"下载特效失败"));}});
    self.effectTasks.push(task);
  });
};
ModelRenderer.prototype.loadEffects=function(onState){
  if(this.disposed||!this.ready||this.effectsLoading)return;
  this.effectsLoading=true;var self=this,failed=[];
  effectsConfig.effects.forEach(function(def){self.dropGroup(def.key);});this.effectGroups=[];
  return effectsConfig.effects.reduce(function(job,definition){return job.then(function(){
    if(self.disposed)return;
    onState("正在加载"+definition.label+"特效",false);
    return self.readEffect(definition).then(function(asset){return self.uploadParts(asset.primitives,definition.key).then(function(){
      if(!self.disposed)self.effectGroups.push({key:definition.key,asset:asset,root:effectRoot(self.alignment,definition)});
    });}).catch(function(error){self.dropGroup(definition.key);failed.push(definition.label+"："+error.message);});
  });},Promise.resolve()).then(function(){
    self.effectsLoading=false;if(!self.disposed)onState(failed.length?"部分特效未加载（"+failed.join("；")+"）":"盾、山、法阵、文字特效已就绪",failed.length>0);
  });
};
ModelRenderer.prototype.dropGroup=function(group){
  var gl=this.gl;this.parts=this.parts.filter(function(p){if(p.group!==group)return true;gl.deleteBuffer(p.vertex);gl.deleteBuffer(p.index);gl.deleteTexture(p.texture);return false;});
};
ModelRenderer.prototype.resetTimeline=function(){this.clock.reset();};
ModelRenderer.prototype.draw=function(corners,width,height,aspect){
  var now=Date.now();
  if(!this.enabled||!this.ready||this.disposed){this.clock.time(false,now);return null;}
  var transform=pose.solve(corners,width,height,aspect,this.fov);if(!transform){this.clock.time(false,now);return null;}
  var seconds=this.clock.time(true,now),worlds={},self=this;
  if(this.effectsEnabled)this.effectGroups.forEach(function(group){
    var nodes=animation.matrices(group.asset,seconds);worlds[group.key]=nodes.map(function(matrix){return matrix?pose.multiply(group.root,matrix):null;});
  });
  var gl=this.gl,u=this.uniforms,a=this.attributes,m=transform.view;
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.frontFace(gl.CCW);gl.cullFace(gl.BACK);
  gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  var rotation=this.rotationNormal;rotation[0]=m[0];rotation[1]=m[1];rotation[2]=m[2];rotation[3]=m[4];rotation[4]=m[5];rotation[5]=m[6];rotation[6]=m[8];rotation[7]=m[9];rotation[8]=m[10];
  gl.uniformMatrix4fv(u.mvp,false,transform.mvp);gl.uniformMatrix3fv(u.rotation,false,rotation);
  gl.uniform1f(u.size,this.scale);gl.uniform1f(u.shiftY,this.offsetY);gl.uniform1i(u.colorMap,0);
  var list=this.drawList;list.length=0;
  this.parts.forEach(function(part){
    var local=part.group==="base"?self.identityMatrix:worlds[part.group]&&worlds[part.group][part.node];if(!local)return;
    var c=part.center,z=0;
    for(var k=0;k<3;k++){var p=local[k]*c[0]+local[4+k]*c[1]+local[8+k]*c[2]+local[12+k];if(k===1)p+=self.offsetY/self.scale;z+=m[k*4+2]*p*self.scale;}
    list.push({part:part,local:local,depth:z+m[14]});
  });
  list.sort(function(a,b){return Number(a.part.transparent)-Number(b.part.transparent)||(a.part.transparent?b.depth-a.depth:0);});
  for(var i=0;i<list.length;i++){
    var part=list[i].part,local=list[i].local;
    gl.uniformMatrix4fv(u.local,false,local);
    gl.uniformMatrix3fv(u.localNormal,false,part.group==="base"||part.transparent?this.identityNormal:glb.normalMatrix(local));
    gl.uniform1f(u.unlit,part.group==="base"?0:1);gl.uniform1f(u.transparent,part.transparent?1:0);gl.uniform2fv(u.repeatUV,part.wrap);
    if(part.transparent){gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);}
    if(part.doubleSided)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER,part.vertex);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.index);
    gl.enableVertexAttribArray(a.position);gl.vertexAttribPointer(a.position,3,gl.FLOAT,false,32,0);
    gl.enableVertexAttribArray(a.normal);gl.vertexAttribPointer(a.normal,3,gl.FLOAT,false,32,12);
    gl.enableVertexAttribArray(a.uv);gl.vertexAttribPointer(a.uv,2,gl.FLOAT,false,32,24);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,part.texture);gl.uniform4fv(u.color,part.color);
    gl.drawElements(gl.TRIANGLES,part.count,part.type,0);
  }
  gl.disableVertexAttribArray(a.position);gl.disableVertexAttribArray(a.normal);gl.disableVertexAttribArray(a.uv);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(false);
  return transform;
};
ModelRenderer.prototype.releaseGpu=function(){
  var gl=this.gl;this.parts.forEach(function(p){gl.deleteBuffer(p.vertex);gl.deleteBuffer(p.index);gl.deleteTexture(p.texture);});this.parts=[];
  if(this.program){gl.deleteProgram(this.program);this.program=null;}
};
ModelRenderer.prototype.dispose=function(){
  this.disposed=true;this.ready=false;if(this.task){this.task.abort();this.task=null;}this.releaseGpu();
  this.effectTasks.forEach(function(task){task.abort();});this.effectTasks=[];this.effectGroups=[];this.clock.reset();
  var fs=wx.getFileSystemManager(),self=this;Object.keys(this.files).forEach(function(file){fs.unlink({filePath:file,complete:function(){delete self.files[file];}});});
  // Keep late image callbacks alive: they observe disposed and release their files.
};
module.exports={ModelRenderer:ModelRenderer,effectRoot:effectRoot};
