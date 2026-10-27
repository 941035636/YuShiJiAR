"use strict";
// Marker axes: x right, y down, z away from camera. All distances use card height=1.
var cv=require("./vendor/jsfeat.js");
var homographyKernel=new cv.motion_model.homography2d(),homographyModel=new cv.matrix_t(3,3,cv.F32C1_t);
function length(v){return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function unit(v){var n=length(v);return n>1e-12?v.map(function(x){return x/n;}):null;}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function multiply(a,b){
  var out=new Float32Array(16);
  for(var c=0;c<4;c++)for(var r=0;r<4;r++)for(var k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
  return out;
}
function viewMatrix(rotation,translation){
  return new Float32Array([
    rotation[0][0],rotation[0][1],rotation[0][2],0,
    rotation[1][0],rotation[1][1],rotation[1][2],0,
    rotation[2][0],rotation[2][1],rotation[2][2],0,
    translation[0],translation[1],translation[2],1
  ]);
}
function rotationFromView(view){
  return [[view[0],view[1],view[2]],[view[4],view[5],view[6]],[view[8],view[9],view[10]]];
}
function translationFromView(view){return [view[12],view[13],view[14]];}
function orthonormalize(rotation){
  var r1=unit(rotation[0]);if(!r1)return null;
  var projection=dot(r1,rotation[1]);
  var r2=unit(rotation[1].map(function(value,index){return value-projection*r1[index];}));if(!r2)return null;
  var r3=unit(cross(r1,r2));if(!r3)return null;
  // Preserve the handedness/facing selected by the homography decomposition.
  if(dot(r3,rotation[2])<0){r2=r2.map(function(value){return -value;});r3=r3.map(function(value){return -value;});}
  return [r1,r2,r3];
}
function rotateVector(vector,delta){
  // Rodrigues expansion is stable for both the tiny numerical derivative and accepted updates.
  var angle=length(delta);if(angle<1e-12)return vector.slice();
  var axis=[delta[0]/angle,delta[1]/angle,delta[2]/angle],cos=Math.cos(angle),sin=Math.sin(angle);
  var projected=dot(axis,vector),side=cross(axis,vector);
  return vector.map(function(value,index){return value*cos+side[index]*sin+axis[index]*projected*(1-cos);});
}
function applyStep(rotation,translation,step){
  var delta=[step[0],step[1],step[2]];
  return {
    rotation:rotation.map(function(column){return rotateVector(column,delta);}),
    translation:[translation[0]+step[3],translation[1]+step[4],translation[2]+step[5]]
  };
}
function predictions(source,rotation,translation,f,cx,cy,near){
  var values=[];
  for(var i=0;i<source.length;i++){
    var p=source[i],x=rotation[0][0]*p.x+rotation[1][0]*p.y+translation[0];
    var y=rotation[0][1]*p.x+rotation[1][1]*p.y+translation[1];
    var z=rotation[0][2]*p.x+rotation[1][2]*p.y+translation[2];
    if(!(z>near)||!isFinite(x+y+z))return null;
    values.push(f*x/z+cx,f*y/z+cy);
  }
  return values;
}
function errorStats(predicted,corners){
  var sum=0,max=0,residual=[];
  for(var i=0;i<corners.length;i++){
    var dx=corners[i].x-predicted[i*2],dy=corners[i].y-predicted[i*2+1],distance=Math.sqrt(dx*dx+dy*dy);
    residual.push(dx,dy);sum+=dx*dx+dy*dy;max=Math.max(max,distance);
  }
  return {sum:sum,max:max,residual:residual};
}
function solveLinear(matrix,vector){
  var size=vector.length,rows=new Array(size);
  for(var r=0;r<size;r++){rows[r]=matrix[r].slice();rows[r].push(vector[r]);}
  for(var column=0;column<size;column++){
    var pivot=column;
    for(var scan=column+1;scan<size;scan++)if(Math.abs(rows[scan][column])>Math.abs(rows[pivot][column]))pivot=scan;
    if(Math.abs(rows[pivot][column])<1e-10)return null;
    if(pivot!==column){var swap=rows[pivot];rows[pivot]=rows[column];rows[column]=swap;}
    var divisor=rows[column][column];for(var c=column;c<=size;c++)rows[column][c]/=divisor;
    for(var rr=0;rr<size;rr++)if(rr!==column){
      var factor=rows[rr][column];if(!factor)continue;
      for(c=column;c<=size;c++)rows[rr][c]-=factor*rows[column][c];
    }
  }
  return rows.map(function(row){return row[size];});
}
function refine(source,corners,rotation,translation,f,cx,cy,near,height){
  var predicted=predictions(source,rotation,translation,f,cx,cy,near);if(!predicted)return null;
  var stats=errorStats(predicted,corners),initialError=stats.max,iterations=0,damping=1e-3,parameterCount=7;
  for(var iteration=0;iteration<7;iteration++){
    var jacobian=new Array(predicted.length),epsRotation=1e-4,epsTranslation=Math.max(1e-5,translation[2]*1e-4);
    for(var row=0;row<jacobian.length;row++)jacobian[row]=new Array(parameterCount);
    for(var parameter=0;parameter<parameterCount;parameter++){
      var step=[0,0,0,0,0,0],epsilon=parameter<3?epsRotation:parameter<6?epsTranslation:1e-4;
      if(parameter<6)step[parameter]=epsilon;
      var trial=applyStep(rotation,translation,step),trialF=parameter===6?f*Math.exp(epsilon):f;
      var shifted=predictions(source,trial.rotation,trial.translation,trialF,cx,cy,near);if(!shifted)return null;
      for(row=0;row<jacobian.length;row++)jacobian[row][parameter]=(shifted[row]-predicted[row])/epsilon;
    }
    var normal=new Array(parameterCount),rhs=new Array(parameterCount).fill(0);
    for(var a=0;a<parameterCount;a++){
      normal[a]=new Array(parameterCount).fill(0);
      for(row=0;row<jacobian.length;row++){
        rhs[a]+=jacobian[row][a]*stats.residual[row];
        for(var b=0;b<parameterCount;b++)normal[a][b]+=jacobian[row][a]*jacobian[row][b];
      }
      normal[a][a]+=damping*(normal[a][a]+1);
    }
    var delta=solveLinear(normal,rhs);if(!delta||delta.some(function(value){return !isFinite(value);}))break;
    var rotationMagnitude=length(delta.slice(0,3));
    if(rotationMagnitude>.18)for(a=0;a<3;a++)delta[a]*=.18/rotationMagnitude;
    var translationLimit=Math.max(.01,translation[2]*.12);
    for(a=3;a<6;a++)delta[a]=clamp(delta[a],-translationLimit,translationLimit);
    delta[6]=clamp(delta[6],-.12,.12);
    trial=applyStep(rotation,translation,delta);
    var normalized=orthonormalize(trial.rotation);if(!normalized)break;trial.rotation=normalized;
    trialF=clamp(f*Math.exp(delta[6]),height*.45,height*1.8);
    shifted=predictions(source,trial.rotation,trial.translation,trialF,cx,cy,near);if(!shifted)break;
    var nextStats=errorStats(shifted,corners);
    if(nextStats.sum+1e-7<stats.sum){
      rotation=trial.rotation;translation=trial.translation;f=trialF;predicted=shifted;stats=nextStats;iterations++;damping=Math.max(1e-5,damping*.35);
      if(stats.sum<1e-6)break;
    }else{
      damping*=12;
      if(damping>10)break;
    }
  }
  return {rotation:rotation,translation:translation,focalLength:f,error:stats.max,initialError:initialError,iterations:iterations};
}
function projectionMatrix(f,width,height){
  var near=.01,far=100;
  return new Float32Array([2*f/width,0,0,0,0,-2*f/height,0,0,0,0,(far+near)/(far-near),1,0,0,-2*far*near/(far-near),0]);
}
function solve(corners,width,height,aspect,fov){
  if(!corners||corners.length!==4||!(width>0&&height>0&&aspect>0&&fov>=30&&fov<=90))return null;
  var source=[{x:-aspect/2,y:-.5},{x:aspect/2,y:-.5},{x:aspect/2,y:.5},{x:-aspect/2,y:.5}];
  if(corners.some(function(p){return !isFinite(p.x)||!isFinite(p.y);}))return null;
  if(!homographyKernel.check_subset(source,corners,4)||!homographyKernel.run(source,corners,homographyModel,4))return null;
  var h=homographyModel.data,f=height/(2*Math.tan(fov*Math.PI/360)),cx=width/2,cy=height/2;
  var a=[(h[0]-cx*h[6])/f,(h[3]-cy*h[6])/f,h[6]];
  var b=[(h[1]-cx*h[7])/f,(h[4]-cy*h[7])/f,h[7]];
  var translation=[(h[2]-cx*h[8])/f,(h[5]-cy*h[8])/f,h[8]];
  var scale=2/(length(a)+length(b));if(translation[2]<0)scale=-scale;
  a=a.map(function(value){return value*scale;});b=b.map(function(value){return value*scale;});translation=translation.map(function(value){return value*scale;});
  if(!isFinite(scale)||length(a)<1e-6||length(b)<1e-6||translation[2]<.05||translation[2]>100)return null;
  var r1=unit(a),projection=dot(r1,b),r2=unit(b.map(function(value,index){return value-projection*r1[index];}));if(!r1||!r2)return null;
  var r3=cross(r1,r2),rotation=[r1,r2,r3];if(r3[2]<=0)return null;
  var refined=refine(source,corners,rotation,translation,f,cx,cy,.01,height);if(!refined||refined.rotation[2][2]<=0)return null;
  if(refined.error>Math.max(15,Math.sqrt(width*width+height*height)*.08))return null;
  f=refined.focalLength;
  var view=viewMatrix(refined.rotation,refined.translation),camera=projectionMatrix(f,width,height);
  return {view:view,projection:camera,mvp:multiply(camera,view),error:refined.error,initialError:refined.initialError,iterations:refined.iterations,focalLength:f,width:width,height:height};
}
function PoseFilter(){this.reset();}
PoseFilter.prototype.reset=function(){this.view=null;this.focalLength=null;this.at=null;};
PoseFilter.prototype.update=function(transform,now){
  if(!transform){this.reset();return null;}
  now=typeof now==="number"?now:Date.now();
  if(!this.view){this.view=new Float32Array(transform.view);this.focalLength=transform.focalLength;this.at=now;return transform;}
  var previousRotation=rotationFromView(this.view),rotation=rotationFromView(transform.view);
  var previousTranslation=translationFromView(this.view),translation=translationFromView(transform.view);
  var dt=clamp(now-this.at,16,160),averageZ=Math.max(.05,(previousTranslation[2]+translation[2])*.5);
  var centerMotion=transform.focalLength*Math.sqrt(Math.pow(translation[0]-previousTranslation[0],2)+Math.pow(translation[1]-previousTranslation[1],2))/averageZ;
  var depthMotion=transform.focalLength*Math.abs(translation[2]-previousTranslation[2])/Math.max(.01,averageZ*averageZ);
  var trace=dot(previousRotation[0],rotation[0])+dot(previousRotation[1],rotation[1])+dot(previousRotation[2],rotation[2]);
  var angle=Math.acos(clamp((trace-1)*.5,-1,1)),rotationMotion=angle*transform.focalLength/averageZ*.35;
  var base=1-Math.exp(-dt/115),confidence=1/(1+transform.error/5);
  // Screen-plane movement is intentional more often than large single-frame tilt/depth changes.
  // Treat the axes separately so the model follows hand movement without amplifying planar-pose wobble.
  var translationAlpha=base+(1-base)*clamp((centerMotion-1.5)/16,0,1);
  var rotationBase=base*.62,rotationAlpha=rotationBase+(.7-rotationBase)*clamp((rotationMotion-2)/18,0,1)*confidence;
  var depthBase=base*.68,depthAlpha=depthBase+(.76-depthBase)*clamp((depthMotion-2)/20,0,1)*confidence;
  translationAlpha=clamp(translationAlpha,.12,.94);rotationAlpha=clamp(rotationAlpha,.1,.7);depthAlpha=clamp(depthAlpha,.11,.76);
  var blendedRotation=[];
  for(var column=0;column<3;column++)blendedRotation[column]=rotation[column].map(function(value,index){return previousRotation[column][index]+(value-previousRotation[column][index])*rotationAlpha;});
  blendedRotation=orthonormalize(blendedRotation)||rotation;
  var blendedTranslation=translation.map(function(value,index){var alpha=index===2?depthAlpha:translationAlpha;return previousTranslation[index]+(value-previousTranslation[index])*alpha;});
  this.view=viewMatrix(blendedRotation,blendedTranslation);this.focalLength+=(transform.focalLength-this.focalLength)*depthAlpha;this.at=now;
  var projection=projectionMatrix(this.focalLength,transform.width,transform.height);
  return {view:this.view,projection:projection,mvp:multiply(projection,this.view),error:transform.error,initialError:transform.initialError,iterations:transform.iterations,focalLength:this.focalLength,width:transform.width,height:transform.height,filterAlpha:{translation:translationAlpha,rotation:rotationAlpha,depth:depthAlpha}};
};
module.exports={solve:solve,multiply:multiply,PoseFilter:PoseFilter};
