"use strict";
// glTF metallic/roughness conventions; analytic studio lighting, without an HDR environment asset.
var vertex=[
  "attribute vec3 position;attribute vec3 normal;attribute vec2 uv;attribute vec4 tangent;",
  "uniform mat4 mvp;uniform mat4 view;uniform mat4 local;uniform mat3 rotation;uniform mat3 localNormal;",
  "uniform float size;uniform float shiftY;varying mediump vec2 tex;varying mediump vec3 n;varying mediump vec4 t;varying mediump vec3 cameraPosition;",
  "void main(){vec3 p=(local*vec4(position,1.)).xyz*size;p.y+=shiftY;gl_Position=mvp*vec4(p,1.);",
  "tex=uv;n=rotation*localNormal*normal;t=vec4(rotation*mat3(local)*tangent.xyz,tangent.w);cameraPosition=(view*vec4(p,1.)).xyz;}"
].join("\n");
var common=[
  "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",
  "uniform sampler2D colorMap;uniform vec4 color;uniform vec2 repeatUV;uniform float unlit;uniform float transparent;",
  "uniform float exposure;uniform float effectExposure;uniform float materialMode;varying mediump vec2 tex;varying mediump vec3 n;",
  "vec3 linearColor(vec3 v){return mix(v/12.92,pow((v+.055)/1.055,vec3(2.4)),step(vec3(.04045),v));}",
  "vec3 displayColor(vec3 v){v=max(v,vec3(0.));return mix(v*12.92,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v));}",
  "vec3 tone(vec3 v){return clamp((v*(2.51*v+.03))/(v*(2.43*v+.59)+.14),0.,1.);}",
  "vec2 sampleUV(){return mix(clamp(tex,0.,1.),fract(tex),repeatUV);}",
  "vec4 baseSample(vec2 uv){return texture2D(colorMap,uv);}",
  "float sampleAlpha(vec4 v){return mix(1.,v.a*color.a,transparent);}"
].join("\n");
var simple=common+[
  "\nvoid main(){vec4 c=baseSample(sampleUV());float a=sampleAlpha(c);if(a<.003)discard;",
  "vec3 base=linearColor(c.rgb)*color.rgb;float light=mix(.75+.25*max(dot(normalize(n),normalize(vec3(-.3,-.5,-1.))),0.),1.,unlit);",
  "gl_FragColor=vec4(displayColor(base*light),a);}"
].join("\n");
var pbr=common+[
  "\nuniform sampler2D normalMap;uniform sampler2D materialMap;uniform sampler2D occlusionMap;",
  "uniform vec4 materialParams;uniform float normalScale;uniform vec2 lightIntensity;varying mediump vec4 t;varying mediump vec3 cameraPosition;",
  "const float PI=3.14159265;",
  "vec3 fresnel(vec3 f0,float v){float a=1.-clamp(v,0.,1.);float a2=a*a;return f0+(1.-f0)*a2*a2*a;}",
  "vec3 directLight(vec3 N,vec3 V,vec3 L,vec3 base,float metal,float rough,vec3 f0){",
  "vec3 H=normalize(V+L);float nv=max(dot(N,V),.0001),nl=max(dot(N,L),0.),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);",
  "float alpha=rough*rough,a2=alpha*alpha,d=nh*nh*(a2-1.)+1.;float D=a2/max(PI*d*d,.00001);",
  "float vis=.5/max(nl*sqrt(nv*nv*(1.-a2)+a2)+nv*sqrt(nl*nl*(1.-a2)+a2),.0001);",
  "vec3 F=fresnel(f0,vh);return ((1.-F)*(1.-metal)*base/PI+F*D*vis)*nl;}",
  "vec3 studio(vec3 R,float rough){vec3 sky=mix(vec3(.18,.2,.24),vec3(.85,.90,1.),smoothstep(-.3,.7,-R.y));",
  "float a=pow(max(dot(R,normalize(vec3(-.45,-.6,-1.))),0.),mix(160.,3.,rough));",
  "float b=pow(max(dot(R,normalize(vec3(.7,-.2,-1.))),0.),mix(80.,2.,rough));return sky*.45+vec3(1.,.96,.88)*(a*1.6+b*.6);}",
  "void main(){vec2 uv=sampleUV();vec4 c=baseSample(uv);float a=sampleAlpha(c);if(a<.003)discard;vec3 base=linearColor(c.rgb)*color.rgb;",
  "if(unlit>.5){vec3 outputColor=materialMode>.5?tone(base*effectExposure):base;gl_FragColor=vec4(displayColor(outputColor),a);return;}",
  "if(materialMode<.5){float l=.75+.25*max(dot(normalize(n),normalize(vec3(-.3,-.5,-1.))),0.);gl_FragColor=vec4(displayColor(base*l),a);return;}",
  "vec3 N=normalize(n);vec3 T=normalize(t.xyz-N*dot(N,t.xyz));vec3 B=normalize(cross(N,T))*t.w;",
  "vec3 sampledNormal=texture2D(normalMap,uv).xyz*2.-1.;sampledNormal.xy*=normalScale;N=normalize(mat3(T,B,N)*sampledNormal);",
  "if(!gl_FrontFacing)N=-N;vec3 V=normalize(-cameraPosition);vec4 mr=texture2D(materialMap,uv);",
  "float metal=clamp(mr.b*materialParams.x,0.,1.),rough=clamp(mr.g*materialParams.y,.09,1.);",
  "float ao=mix(1.,texture2D(occlusionMap,uv).r,materialParams.z);vec3 f0=mix(vec3(.04),base,metal);",
  "vec3 direct=directLight(N,V,normalize(vec3(-.45,-.6,-1.)),base,metal,rough,f0)*lightIntensity.y;",
  "direct+=directLight(N,V,normalize(vec3(.7,-.15,-1.)),base,metal,rough,f0)*.55;",
  "float nv=max(dot(N,V),0.);vec3 F=f0+(max(vec3(1.-rough),f0)-f0)*pow(1.-nv,5.);",
  "float hemi=.65+.35*clamp(-N.y*.5+.5,0.,1.);vec3 diffuse=base*(1.-metal)*lightIntensity.x*.35*hemi*ao;",
  "vec3 reflected=studio(reflect(-V,N),rough)*F*(1.-.55*rough)*mix(1.,ao,.5);",
  "gl_FragColor=vec4(displayColor(tone((direct+diffuse+reflected)*exposure)),a);}"
].join("\n");
module.exports={vertex:vertex,fragmentPbr:pbr,fragmentSimple:simple};
