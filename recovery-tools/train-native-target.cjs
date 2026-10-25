// Input: RGBA file and {width,height} JSON produced from tssgd.jpg.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const cv=require(path.join(root,'pages/ar-native-track/vendor/jsfeat.js'));
const features=require(path.join(root,'pages/ar-native-track/features.js'));
const [input, metadata]=process.argv.slice(2);
if(!input||!metadata)throw new Error('Usage: node train-native-target.cjs INPUT_RGBA METADATA_JSON');
const {width,height}=JSON.parse(fs.readFileSync(metadata,'utf8'));
const bytes=new Uint8Array(fs.readFileSync(input));
if(bytes.length!==width*height*4)throw new Error('Invalid input image size');
const gray=features.grayscale(bytes,width,height),points=[],descriptors=[];
for(const scale of [1,Math.SQRT1_2,0.5,Math.SQRT1_2/2,0.25]){
 const image=new cv.matrix_t(Math.round(width*scale),Math.round(height*scale),cv.U8C1_t);
 cv.imgproc.resample(gray,image,image.cols,image.rows);
 const result=features.extract(image,380);
 for(let i=0;i<result.points.length;i++){
  points.push({x:result.points[i].x/scale,y:result.points[i].y/scale});
  for(let k=0;k<8;k++)descriptors.push(result.descriptors.buffer.i32[i*8+k]);
 }
}
const target={version:1,width,height,algorithm:'jsfeat-oriented-orb',points,descriptors};
fs.writeFileSync(path.join(root,'pages/ar-native-track/target.json'),JSON.stringify(target));
console.log(JSON.stringify({features:points.length,bytes:JSON.stringify(target).length}));
