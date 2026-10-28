"use strict";
// Edge-directed screen filter used only when default-framebuffer MSAA is unavailable.
var vertex="attribute vec2 p;varying mediump vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
var fragment=[
  "precision mediump float;uniform sampler2D image;uniform vec2 pixel;varying mediump vec2 uv;",
  "float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}",
  "void main(){vec3 c=texture2D(image,uv).rgb;",
  "float a=luma(texture2D(image,uv+pixel*vec2(-1.,-1.)).rgb),b=luma(texture2D(image,uv+pixel*vec2(1.,-1.)).rgb);",
  "float d=luma(texture2D(image,uv+pixel*vec2(-1.,1.)).rgb),e=luma(texture2D(image,uv+pixel*vec2(1.,1.)).rgb),m=luma(c);",
  "float low=min(m,min(min(a,b),min(d,e))),high=max(m,max(max(a,b),max(d,e)));",
  "if(high-low<max(.0312,high*.125)){gl_FragColor=vec4(c,1.);return;}",
  "vec2 along=vec2(-((a+b)-(d+e)),(a+d)-(b+e));float guard=max((a+b+d+e)*.03125,.0078125);",
  "along=clamp(along/(min(abs(along.x),abs(along.y))+guard),-8.,8.)*pixel;",
  "vec3 narrow=.5*(texture2D(image,uv-along/6.).rgb+texture2D(image,uv+along/6.).rgb);",
  "vec3 wide=narrow*.5+.25*(texture2D(image,uv-along*.5).rgb+texture2D(image,uv+along*.5).rgb);",
  "float y=luma(wide);gl_FragColor=vec4(y<low||y>high?narrow:wide,1.);}"
].join("\n");
function Filter(gl,quad,createProgram){this.gl=gl;this.quad=quad;this.program=createProgram(gl,vertex,fragment);this.p=gl.getAttribLocation(this.program,"p");this.image=gl.getUniformLocation(this.program,"image");this.pixel=gl.getUniformLocation(this.program,"pixel");}
Filter.prototype.releaseTarget=function(){var g=this.gl;if(this.depth)g.deleteRenderbuffer(this.depth);if(this.color)g.deleteTexture(this.color);if(this.framebuffer)g.deleteFramebuffer(this.framebuffer);this.depth=null;this.color=null;this.framebuffer=null;};
Filter.prototype.begin=function(width,height){
  var g=this.gl;
  try{
    if(!this.framebuffer||this.width!==width||this.height!==height){
      this.releaseTarget();this.width=width;this.height=height;
      this.framebuffer=g.createFramebuffer();this.color=g.createTexture();this.depth=g.createRenderbuffer();
      if(!this.framebuffer||!this.color||!this.depth)throw new Error("抗锯齿显存分配失败");
      g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.color);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
      g.texImage2D(g.TEXTURE_2D,0,g.RGBA,width,height,0,g.RGBA,g.UNSIGNED_BYTE,null);
      g.bindRenderbuffer(g.RENDERBUFFER,this.depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,width,height);
      g.bindFramebuffer(g.FRAMEBUFFER,this.framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.color,0);
      g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.depth);
      if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error("抗锯齿缓冲不可用");
    }else g.bindFramebuffer(g.FRAMEBUFFER,this.framebuffer);
    return true;
  }catch(error){g.bindFramebuffer(g.FRAMEBUFFER,null);this.releaseTarget();for(var i=0;i<4&&g.getError()!==g.NO_ERROR;i++){}throw error;}
};
Filter.prototype.end=function(){
  var g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.width,this.height);
  g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.BLEND);g.depthMask(false);g.useProgram(this.program);
  g.bindBuffer(g.ARRAY_BUFFER,this.quad);g.enableVertexAttribArray(this.p);g.vertexAttribPointer(this.p,2,g.FLOAT,false,16,0);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.color);g.uniform1i(this.image,0);g.uniform2f(this.pixel,1/this.width,1/this.height);
  g.drawArrays(g.TRIANGLE_STRIP,0,4);
};
Filter.prototype.dispose=function(){this.releaseTarget();if(this.program)this.gl.deleteProgram(this.program);this.program=null;};
module.exports={Filter:Filter,vertex:vertex,fragment:fragment};
