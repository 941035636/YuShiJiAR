"use strict";
// CPU skinning for small unlit effects. Outputs asset-space positions: do not
// apply the mesh node again (glTF 2.0 skins use only joint global transforms).
var multiply=require("./pose.js").multiply;
function palettes(model,worlds){
  return (model.skins||[]).map(function(skin){
    if(!skin.palette)skin.palette=new Float32Array(skin.joints.length*16);
    skin.joints.forEach(function(joint,i){
      skin.palette.set(multiply(worlds[joint],skin.inverseBindMatrices.subarray(i*16,i*16+16)),i*16);
    });return skin.palette;
  });
}
function deform(part,palette,output){
  output=output||new Float32Array(part.vertices);
  var source=part.vertices,weights=part.skin.weights,joints=part.skin.joints;
  for(var i=0;i<source.length/8;i++){
    var at=i*8,x=source[at],y=source[at+1],z=source[at+2],px=0,py=0,pz=0;
    for(var k=0;k<8;k++){
      var weight=weights[at+k];if(!weight)continue;
      var b=joints[at+k]*16;
      px+=weight*(palette[b]*x+palette[b+4]*y+palette[b+8]*z+palette[b+12]);
      py+=weight*(palette[b+1]*x+palette[b+5]*y+palette[b+9]*z+palette[b+13]);
      pz+=weight*(palette[b+2]*x+palette[b+6]*y+palette[b+10]*z+palette[b+14]);
    }
    output[at]=px;output[at+1]=py;output[at+2]=pz;
    // Effects are deliberately unlit; normals/tangents and UVs stay unchanged.
  }
  return output;
}
module.exports={palettes:palettes,deform:deform};
