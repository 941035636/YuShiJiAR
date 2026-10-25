"use strict";
function shader(gl, type, text) {
  var s = gl.createShader(type); gl.shaderSource(s,text); gl.compileShader(s);
  if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl,vs,fs) {
  var p=gl.createProgram(),v=shader(gl,gl.VERTEX_SHADER,vs),f=shader(gl,gl.FRAGMENT_SHADER,fs);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function Preview(canvas) {
  var gl=canvas.getContext("webgl");if(!gl)throw new Error("WebGL 不可用");
  this.canvas=canvas;this.gl=gl;
  this.imageProgram=program(gl,"attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(p,0.,1.);}","precision mediump float;varying vec2 v;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,v);}");
  this.lineProgram=program(gl,"attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);gl_PointSize=7.;}","precision mediump float;void main(){gl_FragColor=vec4(.1,1.,.25,1.);}");
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,1,0,0,-1,-1,0,1,1,1,1,0,1,-1,1,1]),gl.STATIC_DRAW);
  this.lines=gl.createBuffer();this.texture=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
Preview.prototype.draw=function(rgba,width,height,corners){
  var gl=this.gl;if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  gl.viewport(0,0,width,height);gl.useProgram(this.imageProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
  var p=gl.getAttribLocation(this.imageProgram,"p"),uv=gl.getAttribLocation(this.imageProgram,"uv");
  gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
  gl.uniform1i(gl.getUniformLocation(this.imageProgram,"image"),0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disableVertexAttribArray(uv);
  if(corners.length===4){
    var vertices=[];corners.forEach(function(q){vertices.push(q.x/width*2-1,1-q.y/height*2);});
    gl.useProgram(this.lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.lines);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    var lineP=gl.getAttribLocation(this.lineProgram,"p");gl.enableVertexAttribArray(lineP);gl.vertexAttribPointer(lineP,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.LINE_LOOP,0,4);gl.drawArrays(gl.POINTS,0,4);
  }
};
Preview.prototype.dispose=function(){var gl=this.gl;gl.deleteBuffer(this.quad);gl.deleteBuffer(this.lines);gl.deleteTexture(this.texture);gl.deleteProgram(this.imageProgram);gl.deleteProgram(this.lineProgram);};
module.exports={Preview:Preview};
