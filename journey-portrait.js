/* Depth-lit Aleph portrait and GPU particle field. Scroll phases follow retained reference evidence. */
(() => {
  'use strict';
  const canvas = document.createElement('canvas');
  canvas.id = 'chaos-world'; canvas.setAttribute('aria-hidden', 'true'); document.body.prepend(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
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
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i.xy+vec2(0.,i.z*57.)),hash(i.xy+vec2(1.,i.z*57.)),f.x),mix(hash(i.xy+vec2(0.,1.+i.z*57.)),hash(i.xy+vec2(1.,1.+i.z*57.)),f.x),f.y),mix(mix(hash(i.xy+vec2(0.,(i.z+1.)*57.)),hash(i.xy+vec2(1.,(i.z+1.)*57.)),f.x),mix(hash(i.xy+vec2(0.,1.+(i.z+1.)*57.)),hash(i.xy+vec2(1.,1.+(i.z+1.)*57.)),f.x),f.y),f.z);}
vec3 field(vec3 p){return vec3(noise(p),noise(p+vec3(19.1,33.4,47.2)),noise(p+vec3(74.2,12.8,3.4)));}
vec3 curl(vec3 p){float e=.08;vec3 dx=field(p+vec3(e,0.,0.))-field(p-vec3(e,0.,0.));vec3 dy=field(p+vec3(0.,e,0.))-field(p-vec3(0.,e,0.));vec3 dz=field(p+vec3(0.,0.,e))-field(p-vec3(0.,0.,e));return normalize(vec3(dy.z-dz.y,dz.x-dx.z,dx.y-dy.x)+.0001);}
float portraitSize(){return uResolution.y*mix(1.12,.58,uMobile);}
vec2 portraitCenter(){return vec2(uResolution.x*mix(.58,.50,uMobile),uResolution.y*mix(.50,.38,uMobile));}
`;
  const planeVertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const planeFragment=common+`
uniform sampler2D uColor,uDepth,uNormal,uBlur,uScan;varying vec2 vUv;
vec2 depthUV(vec2 uv){vec2 motion=uPointer*.05*phase(.08,.18,uProgress)*(1.-.8*phase(.85,1.,uProgress));motion.y*=uResolution.y/uResolution.x;float layer=0.;vec2 ray=uv;float stepSize=1./32.;for(int i=0;i<32;i++){float d=texture2D(uDepth,ray).r;if(layer>d)break;ray-=motion*stepSize;layer+=stepSize;}return ray+motion*.5;}
void main(){
 vec2 pixel=vec2(vUv.x,1.-vUv.y)*uResolution;
 float rise=(1.-phase(0.,.14,uProgress))*uResolution.y*1.3;
 vec2 uv=(pixel-portraitCenter()-vec2(0.,rise))/portraitSize()+.5;uv.y=1.-uv.y;
 if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;
 vec2 duv=depthUV(uv);vec4 color=texture2D(uColor,duv),blur=texture2D(uBlur,duv);blur.a*=color.a;
 color=mix(blur,color,sqrt(phase(.05,.15,uProgress)));
 if(color.a<.005)discard;
 vec3 normal=normalize(texture2D(uNormal,duv).xyz*2.-1.);
 vec3 pos=vec3((duv-.5)*3.01,texture2D(uDepth,duv).r*.3);
 vec3 light1=normalize(vec3(.5+uPointer.x*.3,.4+uPointer.y,.6)-pos);
 vec3 light2=normalize(vec3(-1.+uPointer.x*.3,-.6+uPointer.y*.3,.6)-pos);
 float lightIn=phase(.10,.25,uProgress);
 vec3 lighting=vec3(1.4+2.1*lightIn)+vec3(.31,.77,.69)*max(0.,dot(normal,light1))*1.2*lightIn+vec3(.64,.73,1.)*max(0.,dot(normal,light2))*2.0*lightIn;
 vec3 rgb=pow(max(color.rgb*lighting,vec3(0.)),vec3(1./2.2));
 // A curved travelling dot scan uses the source highlight mask rather than a flat horizontal line.
 float scanWidth=.24*phase(.74,.79,uProgress)*(1.-phase(.95,1.,uProgress));
 vec2 dir=normalize(vec2(.2,-.5)),perp=vec2(-dir.y,dir.x);
 float curve=dot(duv,dir)+1.2*pow(dot(duv-.5,perp),2.);
 float travel=fract(curve-uTime*.12-uProgress*2.);
 float band=(1.-smoothstep(scanWidth*.35,scanWidth*.5+.001,abs(travel-.5)))*step(.001,scanWidth);
 vec2 grid=duv*145.;grid.x+=mod(floor(grid.y),2.)*.5;vec2 cell=floor(grid);vec4 highlight=texture2D(uScan,duv);
 float twinkle=.5+.5*sin(uTime*5.9+hash(cell)*6.283);
 float radius=(.08+.16*highlight.r)*(1.+twinkle*.34)*mix(1.,1.35,uMobile);
 float dotMask=1.-smoothstep(radius*.7,radius,length(fract(grid)-.5));
 float scan=dotMask*band*highlight.a*(.45+.55*hash(cell+2.))*1.5;
 rgb=mix(rgb,vec3(.79,.89,.97),clamp(scan,0.,1.));
 float exitFade=1.-phase(.975,1.04,uProgress);
 gl_FragColor=vec4(rgb,color.a*mix(.5,1.,phase(.05,.10,uProgress))*exitFade);
}`;
 const particleVertex=common+`
attribute vec3 aSeed;varying vec4 vColor;
void main(){
 float morph=phase(.53,.68,uProgress),show=phase(.30,.34,uProgress)*(1.-phase(.72,.76,uProgress));
 vec3 seed=aSeed;vec3 flow=curl(seed*2.+uTime*.1)+curl(seed*6.+uTime*.08)*.13;
 vec3 chaos=seed*.40+flow*.19;
 float radius=length(seed.xy)*.8+noise(vec3(seed.xy*2.,uTime*.15))*.2;
 float angle=atan(seed.y,seed.x)+radius*5.-uTime*.28;
 vec3 spiral=vec3(cos(angle*3.)*radius,sin(angle*3.)*radius*.64,seed.z*.16);
 spiral.xy+=vec2(sin(uTime*.4+seed.x*10.),cos(uTime*.4+seed.y*10.))*.045;
 vec3 q=mix(chaos,spiral*.55,morph);
 float size=portraitSize();vec2 center=portraitCenter()+vec2(-size*.08,-size*.18);
 float perspective=1./(1.+q.z*.5);vec2 px=center+vec2(q.x,-q.y)*size*.62*perspective;
 px+=uPointer*vec2(18.,12.);
 vec2 clip=px/uResolution*2.-1.;clip.y=-clip.y;gl_Position=vec4(clip,0.,1.);
 float sparkle=hash(seed.xy*93.);gl_PointSize=max(1.,(uResolution.y/900.)*(.8+sparkle*1.2))*uDpr;
 vec3 tint=mix(mix(vec3(.588,.659,.973),vec3(.09,.824,.937),sparkle),mix(vec3(.396,.58,.773),vec3(.376,.451,.859),sparkle),morph);
 vColor=vec4(tint,show*mix(.16,.32,morph)*(.4+sparkle*.6));
}`;
 const particleFragment=`precision mediump float;varying vec4 vColor;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vColor.rgb,vColor.a*(1.-smoothstep(.15,.5,r)));}`;
 let plane,particles,quadBuffer,pointBuffer,count;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,v),fs=shader(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));programs.push(p);return{p,uniforms:new Map()};}
 function loc(p,name){if(!p.uniforms.has(name))p.uniforms.set(name,gl.getUniformLocation(p.p,name));return p.uniforms.get(name);}
 function uniform(p,name,...values){const l=loc(p,name);if(l===null)return;if(values.length===2)gl.uniform2f(l,...values);else gl.uniform1f(l,values[0]);}
 async function texture(file,unit){const image=new Image();image.src='assets/aleph/'+file+'.png';await image.decode();const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);textures[unit]=t;}
 async function init(){
  plane=program(planeVertex,planeFragment);particles=program(particleVertex,particleFragment);
  quadBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  count=innerWidth<700?16384:65536;const seeds=new Float32Array(count*3);let seed=1729;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const z=rand()*2-1,a=rand()*Math.PI*2,r=Math.cbrt(rand()),v=Math.sqrt(1-z*z);seeds[i*3]=Math.cos(a)*v*r;seeds[i*3+1]=Math.sin(a)*v*r;seeds[i*3+2]=z*r;}
  pointBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);gl.bufferData(gl.ARRAY_BUFFER,seeds,gl.STATIC_DRAW);
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
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  for(const p of [plane,particles]){gl.useProgram(p.p);uniform(p,'uResolution',width,height);uniform(p,'uPointer',paused?0:pointer[0],paused?0:pointer[1]);uniform(p,'uTime',time);uniform(p,'uProgress',reduced?.24:progress);uniform(p,'uDpr',dpr);uniform(p,'uMobile',width<700?1:0);}
  gl.useProgram(plane.p);['uColor','uDepth','uNormal','uBlur','uScan'].forEach((n,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.uniform1i(loc(plane,n),i);});
  gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);const a=gl.getAttribLocation(plane.p,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(a);
  if(!reduced&&progress>.295&&progress<.77){gl.useProgram(particles.p);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);const b=gl.getAttribLocation(particles.p,'aSeed');gl.enableVertexAttribArray(b);gl.vertexAttribPointer(b,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,count);gl.disableVertexAttribArray(b);}
  return true;
 }
 init().catch(fail);
})();
