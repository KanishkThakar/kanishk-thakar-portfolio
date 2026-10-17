/* Depth-lit Aleph portrait and GPU particle field. Scroll phases follow retained reference evidence. */
(() => {
  'use strict';
  const canvas = document.createElement('canvas');
  canvas.id = 'chaos-world'; canvas.setAttribute('aria-hidden', 'true'); document.body.prepend(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  const clamp = n => Math.max(0, Math.min(1, n));
  const phase = (p,a,b) => {const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
  let ready=false, lost=false, width=0, height=0, dpr=1, pointer=[0,0], progress=0, previous=0;
  const textures=[], programs=[];
  const api = window.journeyPortrait = { get ready(){return ready&&!lost;}, render, hide(){canvas.style.opacity='0';} };
  if(!gl){canvas.remove();return;}
  canvas.addEventListener('webglcontextlost', e=>{e.preventDefault();lost=true;canvas.style.opacity='0';});
  canvas.addEventListener('webglcontextrestored', ()=>{lost=false;ready=false;init().catch(fail);});
  const common = `precision highp float;
uniform vec2 uResolution,uPointer;uniform float uTime,uProgress,uDpr,uMobile;
float phase(float a,float b,float p){return smoothstep(a,b,p);}
vec3 srgbToLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 linearToSrgb(vec3 c){c=max(c,vec3(0.));return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i.xy+vec2(0.,i.z*57.)),hash(i.xy+vec2(1.,i.z*57.)),f.x),mix(hash(i.xy+vec2(0.,1.+i.z*57.)),hash(i.xy+vec2(1.,1.+i.z*57.)),f.x),f.y),mix(mix(hash(i.xy+vec2(0.,(i.z+1.)*57.)),hash(i.xy+vec2(1.,(i.z+1.)*57.)),f.x),mix(hash(i.xy+vec2(0.,1.+(i.z+1.)*57.)),hash(i.xy+vec2(1.,1.+(i.z+1.)*57.)),f.x),f.y),f.z);}
vec3 field(vec3 p){return vec3(noise(p),noise(p+vec3(19.1,33.4,47.2)),noise(p+vec3(74.2,12.8,3.4)));}
vec3 curl(vec3 p){float e=.08;vec3 dx=field(p+vec3(e,0.,0.))-field(p-vec3(e,0.,0.));vec3 dy=field(p+vec3(0.,e,0.))-field(p-vec3(0.,e,0.));vec3 dz=field(p+vec3(0.,0.,e))-field(p-vec3(0.,0.,e));return normalize(vec3(dy.z-dz.y,dz.x-dx.z,dx.y-dy.x)+.0001);}
float portraitSize(){return uResolution.y*mix(.96,.58,uMobile);}
vec2 portraitCenter(){return vec2(uResolution.x*mix(.50,.50,uMobile),uResolution.y*mix(.58,.38,uMobile));}
`;
  const planeVertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const planeFragment=common+`
uniform sampler2D uColor,uDepth,uNormal,uBlur,uScan;varying vec2 vUv;
// Match the reference ray march: depth displaces UVs, never the lighting plane.
vec2 depthUV(vec2 uv){
 vec2 motion=uPointer*.05*phase(.08,.18,uProgress)*(1.-.8*phase(.85,1.,uProgress));
 motion.y-=.09*(1.-pow(phase(.05,.15,uProgress),3.));
 vec3 ray=vec3(uv-.5,0.),delta=vec3(motion,1.)/45.;
 for(int i=0;i<45;i++){ray+=delta;float surface=1.-texture2D(uDepth,ray.xy+.5).r;if(ray.z>surface){if(ray.z-surface<.01)break;ray-=delta;delta*=.5;}}
 return ray.xy+.5;
}
float attenuation(float distance,float decay){return pow(clamp(1.-pow(distance/3.,4.),0.,1.),2.)/max(pow(distance,decay),.01);}
vec3 pointLighting(vec3 normal,vec3 position,vec3 lightPosition,vec3 lightColor,float intensity,float decay,vec3 diffuse){
 vec3 delta=lightPosition-position,lightDirection=normalize(delta);
 vec3 irradiance=srgbToLinear(lightColor)*intensity*attenuation(length(delta),decay)*max(dot(normal,lightDirection),0.);
 float dotVH=max(dot(vec3(0.,0.,1.),normalize(lightDirection+vec3(0.,0.,1.))),0.);
 float fresnel=exp2((-5.55473*dotVH-6.98316)*dotVH);
 vec3 specular=mix(srgbToLinear(vec3(17./255.)),vec3(1.),fresnel);
 return irradiance*(diffuse+specular*.25)/3.14159265359;
}
void main(){
 vec2 pixel=vec2(vUv.x,1.-vUv.y)*uResolution;
 float rise=(1.-phase(0.,.14,uProgress))*uResolution.y*1.3;
 vec2 uv=(pixel-portraitCenter()-vec2(0.,rise))/portraitSize()+.5;uv.y=1.-uv.y;
 if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;
 vec2 duv=depthUV(uv);vec4 color=texture2D(uColor,duv),blur=texture2D(uBlur,duv);blur.a*=color.a;
 // These PNGs retain the source sRGB bytes; normal and depth maps stay unconverted.
 color.rgb=srgbToLinear(color.rgb);blur.rgb=srgbToLinear(blur.rgb);
 color=mix(blur,color,sqrt(phase(.05,.15,uProgress)));
 if(color.a<.005)discard;
 // Reference scan mixes into the diffuse map before the portrait is lit.
 float scanWidth=.24*phase(.74,.79,uProgress)*(1.-phase(.95,1.,uProgress));
 vec2 dir=normalize(vec2(.2,-.5)),perp=vec2(-dir.y,dir.x);
 float curve=dot(uv,dir)+1.2*pow(dot(uv,perp),2.);
 float travel=fract(curve-uTime*.6),halfWidth=scanWidth*.5;
 float band=(smoothstep(.5-halfWidth-.3,.5-halfWidth+.3,travel)-smoothstep(.5+halfWidth-.3,.5+halfWidth+.3,travel))*step(.001,scanWidth);
 vec2 grid=duv*145.;grid.x+=mod(floor(grid.y),2.)*.5;vec2 cell=floor(grid);
 vec4 highlight=texture2D(uScan,(cell+.5)/145.);highlight.rgb=srgbToLinear(highlight.rgb);
 float twinkle=.5+.5*sin(uTime*3.54+hash(cell)*6.283);
 float radius=1.65*mix(.2,.7,highlight.r)*.1*(1.+twinkle*.34)*mix(1.,2.,uMobile);
 float dotMask=1.-step(radius,length(fract(grid)-.5));
 float scan=dotMask*band*highlight.a*(.45+.55*hash(cell+1.))*2.5*twinkle;
 color.rgb=mix(color.rgb,srgbToLinear(vec3(202.,227.,248.)/255.),clamp(scan,0.,1.));
 vec3 normal=normalize(texture2D(uNormal,duv).xyz*2.-1.);
 vec3 pos=vec3((uv-.5)*3.01+vec2(0.,-.2),0.);
 float lightIn=1.-pow(1.-clamp((uProgress-.10)/.15,0.,1.),3.);
 vec3 lit=color.rgb*(3.5/3.14159265359);
 lit+=pointLighting(normal,pos,vec3(.5+uPointer.x*.3,.4-uPointer.y,.6),vec3(79.,197.,176.)/255.,.4,6.8,color.rgb);
 lit+=pointLighting(normal,pos,vec3(-1.+uPointer.x*.3,-.6-uPointer.y*.3,.6),vec3(162.,187.,255.)/255.,.9,7.2,color.rgb);
 vec3 rgb=linearToSrgb(lit*lightIn);
 float exitFade=1.-phase(.975,1.04,uProgress);
 gl_FragColor=vec4(rgb,color.a*mix(.5,1.,phase(.05,.10,uProgress))*exitFade);
}`;
 const particleVertex=common+`
attribute vec3 aSeed;attribute vec2 aParticleUv;varying vec4 vColor;
void main(){
 float morph=phase(.53,.68,uProgress),show=phase(.30,.34,uProgress)*(1.-phase(.72,.76,uProgress));
 vec3 seed=aSeed;float chaosTime=15.+uTime*.45,orderTime=1.5+uTime*.045;
 vec3 base=curl(seed*.3+chaosTime),flow=base;
 flow+=curl(flow*.0)*.5;
 flow+=curl(flow*1.8)*.13;
 flow+=curl(flow*1.0434)*.283;
 flow+=curl(flow*1.2)*.3805;
 vec3 chaos=mix(base,flow,noise(base+chaosTime)*2.-1.);
 vec2 particleUv=aParticleUv;
 float radius=length(particleUv)*.8+(noise(vec3(particleUv*2.,orderTime))*2.-1.)*.2;
 float angle=(atan(particleUv.y,particleUv.x)+radius*5.-orderTime*2.)*3.;
 float movement=(noise(vec3(cos(angle)*radius,sin(angle)*radius,orderTime*.5))*2.-1.)*sin(orderTime*4.);
 vec3 spiral=vec3(cos(angle)*(radius+movement),sin(angle)*(radius+movement),movement*.1);
 spiral.xy+=vec2(sin(orderTime+particleUv.x*10.),cos(orderTime+particleUv.y*10.))*.15;
 vec3 q=mix(chaos,spiral,morph)*mix(.45,.4,morph);
 float size=portraitSize();vec2 center=portraitCenter()+vec2(-size*.3/3.01,-size*mix(.5,.4,uMobile)/3.01);
 float perspective=1./(1.+q.z*.5);vec2 px=center+vec2(q.x,-q.y)*size/3.01*perspective;
 px+=uPointer*vec2(18.,12.);
 vec2 clip=px/uResolution*2.-1.;clip.y=-clip.y;gl_Position=vec4(clip,0.,1.);
 float sparkle=hash(seed.xy*93.);gl_PointSize=max(1.,uResolution.y/900.);
 vec3 tint=mix(mix(vec3(.588,.659,.973),vec3(.09,.824,.937),sparkle),mix(vec3(.396,.58,.773),vec3(.376,.451,.859),sparkle),morph);
 vColor=vec4(tint,show*mix(.1,.4,morph));
}`;
 const particleFragment=`precision mediump float;varying vec4 vColor;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vColor;}`;
 let plane,particles,quadBuffer,pointBuffer,particleUvBuffer,count;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,v),fs=shader(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));programs.push(p);return{p,uniforms:new Map()};}
 function loc(p,name){if(!p.uniforms.has(name))p.uniforms.set(name,gl.getUniformLocation(p.p,name));return p.uniforms.get(name);}
 function uniform(p,name,...values){const l=loc(p,name);if(l===null)return;if(values.length===2)gl.uniform2f(l,...values);else gl.uniform1f(l,values[0]);}
 async function texture(file,unit){const image=new Image();image.src='assets/aleph/'+file+'.png';await image.decode();const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);textures[unit]=t;}
 async function init(){
  plane=program(planeVertex,planeFragment);particles=program(particleVertex,particleFragment);
  quadBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  // The reference uses 16,384 points on its default medium GPU tier.
  count=16384;const seeds=new Float32Array(count*3),particleUvs=new Float32Array(count*2);let seed=1729;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const z=rand()*2-1,a=rand()*Math.PI*2,r=Math.cbrt(rand()),v=Math.sqrt(1-z*z);seeds[i*3]=Math.cos(a)*v*r;seeds[i*3+1]=Math.sin(a)*v*r;seeds[i*3+2]=z*r;particleUvs[i*2]=(i%128)/128;particleUvs[i*2+1]=Math.floor(i/128)/128;}
  pointBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);gl.bufferData(gl.ARRAY_BUFFER,seeds,gl.STATIC_DRAW);
  particleUvBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,particleUvBuffer);gl.bufferData(gl.ARRAY_BUFFER,particleUvs,gl.STATIC_DRAW);
  await Promise.all(['character','character_depth','character_normal','character_blur','character_scan'].map(texture));
  ready=true;canvas.dataset.renderer='webgl';canvas.dataset.particles=String(count);
 }
 function fail(e){ready=false;canvas.dataset.renderer='fallback';canvas.style.opacity='0';console.warn('Portrait GPU fallback:',e.message);}
 function render({progress:target,time,mouse,paused,reduced,opacity=1}){
  if(!api.ready)return false;
  if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,width<700?1.25:1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
  const now=performance.now(),dt=Math.min((now-previous)/1000,.05);previous=now;
  const damping=1-Math.exp(-dt*12);progress=target;
  if(Math.abs(target-progress)<.0001)progress=target;
  pointer[0]+=(mouse.x-pointer[0])*.06;pointer[1]+=(mouse.y-pointer[1])*.06;
  canvas.style.opacity=String(opacity);canvas.dataset.phase=progress.toFixed(3);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  for(const p of [plane,particles]){gl.useProgram(p.p);uniform(p,'uResolution',width,height);uniform(p,'uPointer',paused?0:pointer[0],paused?0:pointer[1]);uniform(p,'uTime',time);uniform(p,'uProgress',reduced?.24:progress);uniform(p,'uDpr',dpr);uniform(p,'uMobile',width<700?1:0);}
  gl.useProgram(plane.p);['uColor','uDepth','uNormal','uBlur','uScan'].forEach((n,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.uniform1i(loc(plane,n),i);});
  gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);const a=gl.getAttribLocation(plane.p,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(a);
  if(!reduced&&progress>.295&&progress<.77){gl.useProgram(particles.p);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);const b=gl.getAttribLocation(particles.p,'aSeed');gl.enableVertexAttribArray(b);gl.vertexAttribPointer(b,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,particleUvBuffer);const uv=gl.getAttribLocation(particles.p,'aParticleUv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,count);gl.disableVertexAttribArray(b);gl.disableVertexAttribArray(uv);}
  return true;
 }
 init().catch(fail);
})();
