// Export exact runtime shader/mesh inputs for the hidden desktop GPU reference check.
const fs=require('node:fs'),path=require('node:path');
const glb=require('../pages/ar-native-track/glb.js'),pose=require('../pages/ar-native-track/pose.js');
const animation=require('../pages/ar-native-track/animation.js');
const scene=require('../pages/ar-native-track/scene-registry.js').requireNative(process.argv[4]||'ben-zun');
const config=scene.model,effects=scene.effects.effects;
const {effectRoot}=require('../pages/ar-native-track/model-renderer.js');
const shaders=require('../pages/ar-native-track/shaders.js');
const aa=require('../pages/ar-native-track/antialias.js');
const renderScale=Math.max(1,Math.min(2,Number(process.argv[3])||1));
const root=path.resolve(process.argv[2]||path.join(process.env.TEMP,'YuShiJiAR-visual-reference'));
fs.mkdirSync(root,{recursive:true});
function read(relative,effect){const b=fs.readFileSync(path.join('recovery-assets/models',relative));return glb.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),{...config,effect});}
function relativeUrl(url){return decodeURIComponent(new URL(url).pathname).split('/AR-YSJ/')[1];}
const width=592,height=800,aspect=scene.target.width/scene.target.height,f=height/(2*Math.tan(config.fov*Math.PI/360));
const corners=[[-aspect/2,-.5],[aspect/2,-.5],[aspect/2,.5],[-aspect/2,.5]].map(p=>({x:width/2+f*p[0]/1.8,y:height/2+f*p[1]/1.8}));
const transform=pose.solve(corners,width,height,aspect,config.fov);
const jade=relativeUrl(config.variants.jade.url),reference=relativeUrl(config.variants.reference.url);
for(const [key,relative,mode] of [['jade-simple',jade,0],['reference-pbr',reference,1],['jade-pbr',jade,1],['reference-fallback',reference,0]]){
 const main=read(relative,false),parts=[];
 function add(asset,group,worlds,groupExposure,tint){for(const p of asset.primitives){
  function image(value){if(!value)return null;const filename=path.join(root,key+'-'+group+'-'+value.index+'.png');fs.writeFileSync(filename,Buffer.from(value.bytes));return filename;}
  parts.push({vertices:Array.from(p.vertices),tangents:Array.from(p.tangents),indices:Array.from(p.indices),local:Array.from(worlds?worlds[p.node]:glb.identity()),
   image:image(p.image),normalImage:image(p.normalImage),materialImage:image(p.materialImage),occlusionImage:image(p.occlusionImage),
   color:tint?[p.color[0]*tint[0],p.color[1]*tint[1],p.color[2]*tint[2],p.color[3]]:p.color,params:[p.metallic,p.roughness,p.occlusionStrength,0],normalScale:p.normalScale,unlit:group==='base'?0:1,effectExposure:groupExposure||1,transparent:p.transparent,
   doubleSided:p.doubleSided,wrap:[p.wrapS===10497?1:0,p.wrapT===10497?1:0]});
 }}
 add(main,'base');
 for(const def of effects){const asset=read(relativeUrl(def.url),true),rootMatrix=effectRoot(main.alignment,def);
  add(asset,def.key,animation.matrices(asset,6).map(m=>m?pose.multiply(rootMatrix,m):null),def.exposure,def.tint);}
 const output={width,height,vertex:shaders.vertex,fragment:key==='reference-fallback'?shaders.fragmentSimple:shaders.fragmentPbr,view:Array.from(transform.view),mvp:Array.from(transform.mvp),mode,
  renderWidth:Math.round(width*renderScale),renderHeight:Math.round(height*renderScale),postprocess:renderScale>1?{vertex:aa.vertex,fragment:aa.fragment}:null,
  exposure:config.lighting.exposure,effectExposure:config.lighting.effectExposure,lights:[config.lighting.ambient,config.lighting.key],parts};
 fs.writeFileSync(path.join(root,key+'.json'),JSON.stringify(output));
}
console.log(root);
