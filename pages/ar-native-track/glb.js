"use strict";
// Bounded GLB 2 reader for BenZun and its embedded TRS animation effects.
var multiply=require("./pose.js").multiply;
function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function nodeMatrix(node){
  if(node.matrix){if(node.matrix.length!==16)throw new Error("模型节点矩阵不合法");return new Float32Array(node.matrix);}
  var q=node.rotation||[0,0,0,1],s=node.scale||[1,1,1],t=node.translation||[0,0,0];
  var x=q[0],y=q[1],z=q[2],w=q[3];
  return new Float32Array([(1-2*y*y-2*z*z)*s[0],(2*x*y+2*z*w)*s[0],(2*x*z-2*y*w)*s[0],0,
    (2*x*y-2*z*w)*s[1],(1-2*x*x-2*z*z)*s[1],(2*y*z+2*x*w)*s[1],0,
    (2*x*z+2*y*w)*s[2],(2*y*z-2*x*w)*s[2],(1-2*x*x-2*y*y)*s[2],0,t[0],t[1],t[2],1]);
}
function normalMatrix(m){
  var a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]];
  function cross(u,v){return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];}
  var u=cross(b,c),v=cross(c,a),w=cross(a,b),det=a[0]*u[0]+a[1]*u[1]+a[2]*u[2];
  if(Math.abs(det)<1e-10)throw new Error("模型节点缩放为零");
  return u.concat(v,w).map(function(x){return x/det;});
}
function orthogonalTangent(vertices,at,tangents,tangentAt){
  var nx=vertices[at+3],ny=vertices[at+4],nz=vertices[at+5],nn=nx*nx+ny*ny+nz*nz;
  if(nn<1e-12)throw new Error("模型法线长度为零");
  var tx=tangents[tangentAt],ty=tangents[tangentAt+1],tz=tangents[tangentAt+2],dot=(nx*tx+ny*ty+nz*tz)/nn;
  tx-=nx*dot;ty-=ny*dot;tz-=nz*dot;
  var length=Math.sqrt(tx*tx+ty*ty+tz*tz);
  if(length<1e-8){
    // Build a stable perpendicular basis for missing/degenerate authored tangents.
    if(Math.abs(nx)<Math.abs(ny)){tx=0;ty=-nz;tz=ny;}else{tx=-nz;ty=0;tz=nx;}
    length=Math.sqrt(tx*tx+ty*ty+tz*tz);
  }
  tangents[tangentAt]=tx/length;tangents[tangentAt+1]=ty/length;tangents[tangentAt+2]=tz/length;
}
function text(bytes){
  // Decode UTF-8 without a browser TextDecoder dependency.
  var escaped="";for(var i=0;i<bytes.length;i++)escaped+="%"+(bytes[i]+256).toString(16).slice(1);
  return decodeURIComponent(escaped).replace(/\u0000+$/g,"").trim();
}
function parse(buffer,config){
  if(!buffer||buffer.byteLength<28||buffer.byteLength>config.maxBytes)throw new Error("模型文件大小不合法");
  var data=new DataView(buffer);
  if(data.getUint32(0,true)!==0x46546c67||data.getUint32(4,true)!==2||data.getUint32(8,true)!==buffer.byteLength)throw new Error("模型不是完整的 GLB 2 文件");
  var json,binOffset=-1,binLength=0,offset=12;
  while(offset<buffer.byteLength){
    if(offset+8>buffer.byteLength)throw new Error("模型分块头不完整");
    var size=data.getUint32(offset,true),type=data.getUint32(offset+4,true);offset+=8;
    if(size%4||offset+size>buffer.byteLength)throw new Error("模型分块长度不合法");
    if(type===0x4e4f534a){if(json)throw new Error("模型 JSON 分块重复");json=JSON.parse(text(new Uint8Array(buffer,offset,size)));}
    if(type===0x004e4942){if(binOffset>=0)throw new Error("模型二进制分块重复");binOffset=offset;binLength=size;}
    offset+=size;
  }
  if(!json||!json.asset||json.asset.version!=="2.0"||binOffset<0)throw new Error("模型缺少 GLB 数据");
  if((json.extensionsRequired||[]).length||(json.skins||[]).length)throw new Error("本轮仅支持无压缩网格，不能加载骨骼模型");
  if(!json.buffers||json.buffers.length!==1||json.buffers[0].uri||json.buffers[0].byteLength>binLength)throw new Error("模型引用了未支持的外部数据");
  function view(index){
    var v=(json.bufferViews||[])[index];
    if(!v||(v.buffer||0)!==0||!(v.byteLength>=0)||(v.byteOffset||0)<0||(v.byteOffset||0)+v.byteLength>json.buffers[0].byteLength)throw new Error("模型缓冲区越界");
    return v;
  }
  function accessor(index,type,animation){
    var a=(json.accessors||[])[index],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
    if(!a||a.type!==type||a.sparse||a.normalized||!(a.count>0&&a.count<=1000000))throw new Error("模型顶点格式未支持");
    if(animation?a.componentType!==5126:(type==="SCALAR"?a.componentType===5126:a.componentType!==5126))throw new Error("模型顶点类型未支持");
    var bytes={5123:2,5125:4,5126:4}[a.componentType],n=components[type],v=view(a.bufferView),start=a.byteOffset||0,stride=v.byteStride||n*bytes;
    if(!bytes||start<0||stride<n*bytes||start+(a.count-1)*stride+n*bytes>v.byteLength)throw new Error("模型顶点缓冲区越界");
    var out=a.componentType===5126?new Float32Array(a.count*n):new Uint32Array(a.count*n);
    for(var i=0;i<a.count;i++)for(var k=0;k<n;k++){
      var at=binOffset+(v.byteOffset||0)+start+i*stride+k*bytes;
      out[i*n+k]=a.componentType===5126?data.getFloat32(at,true):bytes===2?data.getUint16(at,true):data.getUint32(at,true);
      if(!isFinite(out[i*n+k]))throw new Error("模型包含非有限顶点");
    }
    return out;
  }
  var imageCache={};
  function materialImage(info){
    if(!info)return null;
    if((info.texCoord||0)!==0||info.extensions)throw new Error("本轮只支持未变换的第一组 UV");
    var texture=(json.textures||[])[info.index],image=texture&&(json.images||[])[texture.source];
    if(!image||image.uri||(image.mimeType!=="image/png"&&image.mimeType!=="image/jpeg"))throw new Error("模型贴图格式未支持");
    if(!imageCache[texture.source]){
      var imageView=view(image.bufferView);
      imageCache[texture.source]={index:texture.source,mimeType:image.mimeType,bytes:buffer.slice(binOffset+(imageView.byteOffset||0),binOffset+(imageView.byteOffset||0)+imageView.byteLength)};
    }
    return imageCache[texture.source];
  }
  var primitives=[],bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},active={};
  function visit(index,parent){
    var node=(json.nodes||[])[index];if(!node||active[index])throw new Error("模型节点树不合法");active[index]=true;
    if(node.skin!==undefined||node.weights)throw new Error("本轮不支持骨骼和变形");
    var matrix=multiply(parent,nodeMatrix(node)),normalsMatrix=normalMatrix(matrix);
    if(node.mesh!==undefined){
      var mesh=(json.meshes||[])[node.mesh];if(!mesh)throw new Error("模型网格不存在");
      (mesh.primitives||[]).forEach(function(p){
        if((p.mode!==undefined&&p.mode!==4)||p.targets||p.extensions)throw new Error("本轮只支持静态三角形网格");
        var position=accessor(p.attributes.POSITION,"VEC3"),normal=accessor(p.attributes.NORMAL,"VEC3"),uv=accessor(p.attributes.TEXCOORD_0,"VEC2"),indices=accessor(p.indices,"SCALAR");
        var count=position.length/3;if(normal.length!==position.length||uv.length!==count*2||indices.length%3)throw new Error("模型顶点数量不匹配");
        var interleaved=new Float32Array(count*8),tangents=new Float32Array(count*4);
        var sourceTangent=p.attributes.TANGENT===undefined?null:accessor(p.attributes.TANGENT,"VEC4");
        if(sourceTangent&&sourceTangent.length!==count*4)throw new Error("模型切线数量不匹配");
        for(var i=0;i<count;i++){
          var x=position[i*3],y=position[i*3+1],z=position[i*3+2];
          for(var k=0;k<3;k++){
            var value=matrix[k]*x+matrix[4+k]*y+matrix[8+k]*z+matrix[12+k];
            bounds.min[k]=Math.min(bounds.min[k],value);bounds.max[k]=Math.max(bounds.max[k],value);interleaved[i*8+k]=config.effect?position[i*3+k]:value;
            interleaved[i*8+3+k]=config.effect?normal[i*3+k]:normalsMatrix[k]*normal[i*3]+normalsMatrix[3+k]*normal[i*3+1]+normalsMatrix[6+k]*normal[i*3+2];
          }
          interleaved[i*8+6]=uv[i*2];interleaved[i*8+7]=uv[i*2+1];
          var tx=sourceTangent?sourceTangent[i*4]:1,ty=sourceTangent?sourceTangent[i*4+1]:0,tz=sourceTangent?sourceTangent[i*4+2]:0;
          for(var axis=0;axis<3;axis++)tangents[i*4+axis]=config.effect?[tx,ty,tz][axis]:matrix[axis]*tx+matrix[4+axis]*ty+matrix[8+axis]*tz;
          tangents[i*4+3]=sourceTangent?sourceTangent[i*4+3]:1;
        }
        var max=0;for(var j=0;j<indices.length;j++){if(indices[j]>=count)throw new Error("模型索引越界");max=Math.max(max,indices[j]);}
        var material=(json.materials||[])[p.material]||{},pbr=material.pbrMetallicRoughness||{},image=materialImage(pbr.baseColorTexture);
        if(material.alphaMode&&material.alphaMode!=="OPAQUE"&&!(config.effect&&material.alphaMode==="BLEND"))throw new Error("本轮不支持此模型透明模式");
        var sampler=pbr.baseColorTexture?(json.samplers||[])[(json.textures||[])[pbr.baseColorTexture.index].sampler]||{}:{};
        primitives.push({vertices:interleaved,indices:max<=65535?new Uint16Array(indices):indices,image:image,color:pbr.baseColorFactor||[1,1,1,1],doubleSided:!!material.doubleSided,
          tangents:tangents,normalImage:config.effect?null:materialImage(material.normalTexture),materialImage:config.effect?null:materialImage(pbr.metallicRoughnessTexture),
          occlusionImage:config.effect?null:materialImage(material.occlusionTexture),normalScale:material.normalTexture&&material.normalTexture.scale!==undefined?material.normalTexture.scale:1,
          occlusionStrength:material.occlusionTexture&&material.occlusionTexture.strength!==undefined?material.occlusionTexture.strength:1,
          metallic:pbr.metallicFactor===undefined?1:pbr.metallicFactor,roughness:pbr.roughnessFactor===undefined?1:pbr.roughnessFactor,
          node:index,transparent:material.alphaMode==="BLEND",wrapS:sampler.wrapS||10497,wrapT:sampler.wrapT||10497});
      });
    }
    (node.children||[]).forEach(function(child){visit(child,matrix);});delete active[index];
  }
  var scene=(json.scenes||[])[json.scene||0];if(!scene)throw new Error("模型场景不存在");
  (scene.nodes||[]).forEach(function(index){visit(index,identity());});
  if(config.effect){
    var clips=(json.animations||[]).map(function(clip){
      var duration=0,channels=(clip.channels||[]).map(function(channel){
        var target=channel.target,sampler=(clip.samplers||[])[channel.sampler];
        if(!target||!json.nodes[target.node]||json.nodes[target.node].matrix||["rotation","scale","translation"].indexOf(target.path)<0||!sampler||["LINEAR","STEP"].indexOf(sampler.interpolation||"LINEAR")<0)throw new Error("特效动画通道未支持");
        var times=accessor(sampler.input,"SCALAR",true),values=accessor(sampler.output,target.path==="rotation"?"VEC4":"VEC3",true),size=target.path==="rotation"?4:3;
        if(values.length!==times.length*size||times[0]<0)throw new Error("动画关键帧数量不匹配");
        for(var i=1;i<times.length;i++)if(times[i]<=times[i-1])throw new Error("动画时间顺序不合法");
        duration=Math.max(duration,times[times.length-1]);
        return {node:target.node,path:target.path,times:times,values:values,size:size,interpolation:sampler.interpolation||"LINEAR"};
      });return {name:clip.name||"animation",duration:duration,channels:channels};
    });
    return {primitives:primitives,nodes:json.nodes,roots:scene.nodes,clips:clips,originalBounds:bounds};
  }
  var height=bounds.max[1]-bounds.min[1];if(!primitives.length||!(height>0))throw new Error("模型没有可绘制的网格");
  var s=config.height/height,cx=(bounds.min[0]+bounds.max[0])/2,cy=(bounds.min[1]+bounds.max[1])/2;
  primitives.forEach(function(p){for(var i=0;i<p.vertices.length;i+=8){
    p.vertices[i]=(p.vertices[i]-cx)*s+config.centerX;
    p.vertices[i+1]=-(p.vertices[i+1]-cy)*s+config.centerY;
    p.vertices[i+2]=-(p.vertices[i+2]-bounds.min[2])*s;
    p.vertices[i+4]=-p.vertices[i+4];p.vertices[i+5]=-p.vertices[i+5];
    var tangentIndex=i/8*4;p.tangents[tangentIndex+1]=-p.tangents[tangentIndex+1];p.tangents[tangentIndex+2]=-p.tangents[tangentIndex+2];
    orthogonalTangent(p.vertices,i,p.tangents,tangentIndex);
  }});
  var alignment=new Float32Array([s,0,0,0,0,-s,0,0,0,0,-s,0,config.centerX-cx*s,cy*s+config.centerY,bounds.min[2]*s,1]);
  return {primitives:primitives,originalBounds:bounds,alignment:alignment};
}
module.exports={parse:parse,nodeMatrix:nodeMatrix,normalMatrix:normalMatrix,identity:identity};
