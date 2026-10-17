/* Reference-grounded Aleph particle geometry; one scroll clock is supplied by journey.js. */
(() => {
  'use strict';
  const canvas=document.createElement('canvas');canvas.id='journey-particles';canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'-1',opacity:'0'});document.body.prepend(canvas);
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});
  let ready=false,lost=false,width=0,height=0,dpr=1,sets={},programs={},pointer=[0,0];
  const api=window.journeyParticles={get ready(){return ready&&!lost;},render,hide(){canvas.style.opacity='0';}};
  if(!gl){canvas.remove();return;}
  const clamp=x=>Math.max(0,Math.min(1,x)),ramp=(a,b,x)=>clamp((x-a)/(b-a)),ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  let seed=4357;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const common=`precision highp float;
attribute vec3 aPosition;attribute vec4 aRandom;attribute vec4 aExtra;
uniform vec2 uResolution,uPointer;uniform float uDpr,uTime,uProgress,uOpacity,uMobile,uReduced,uCamera;
varying vec4 vColor;
float sat(float x){return clamp(x,0.,1.);}
float phase(float a,float b,float x){return sat((x-a)/(b-a));}
float ease(float x){return x<.5?4.*x*x*x:1.-pow(-2.*x+2.,3.)*.5;}
vec2 rotate(vec2 p,float a){return mat2(cos(a),sin(a),-sin(a),cos(a))*p;}
void project(vec3 p,float size,vec2 center){
 float depth=uCamera-p.z;float focal=1./tan(mix(.3054326,.418879,uMobile));
 vec2 q=(p.xy-uPointer*.17)*focal/max(depth,.04);q.x*=uResolution.y/uResolution.x;q+=center;
 gl_Position=depth>.06?vec4(q,0.,1.):vec4(3.,3.,0.,1.);
 // The reference writes physical framebuffer point sizes directly. Multiplying
 // by DPR here makes every node 1.5 times larger on a retina desktop.
 gl_PointSize=max(size/max(depth,.06),1.);
}
`;
  const fragment=`precision mediump float;varying vec4 vColor;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float edge=1.-smoothstep(.40,.5,d);gl_FragColor=vec4(vColor.rgb,vColor.a*edge);}`;
  const headVertex=common+`
void main(){
 float transition=pow(phase(0.,.4,uProgress),3.);
 float animate=pow(transition,.5+smoothstep(.1,1.,aExtra.r+aExtra.g));
 vec3 p=aPosition;p.z+=animate*10.*(aRandom.x*.2+1.)*mix(aRandom.z*2.-1.,1.,transition*3.);
 p.xy+=vec2(cos(uTime*.75+aRandom.x*6.),sin(uTime*.75+aRandom.y*6.))*.1*animate*(1.-uReduced);
 p.x+=.5*pow(animate,.7)*(aPosition.x/3.*2.)*uMobile;
 p.y+=pow(animate,.7)*(aPosition.y/3.*2.)*uMobile;
 float alpha=phase(0.,.05,uProgress)*(1.-smoothstep(.20,.25,uProgress))*uOpacity;
 float tint=phase(.25+aRandom.x*.1,.5+aRandom.z*.2,animate);
 vColor=vec4(mix(aExtra.rgb,vec3(.596,.741,.937),tint),alpha);
 project(p,mix(50.,10.,ease(phase(.15,.20,uProgress))),vec2(mix(.16,0.,uMobile),mix(0.,.14,uMobile)));
}`;
  const cloudVertex=common+`
void main(){
 float clock=uTime*.006+phase(.2,1.,uProgress)*.6;
 float raw=clock+aRandom.z;float life=pow(fract(raw),1.+aRandom.x*2.);
 vec3 p=aPosition;p.xy=rotate(p.xy,floor(raw)*3.141593*.3);
 p.z=mix(-35.9,0.,life);
 p.xy+=vec2(cos((clock*10.)*.05+aRandom.x*6.283)*.1,sin((clock*10.)*.05+aRandom.y*6.283)*.061)*(1.-uReduced);
 float depth=max(.06,uCamera-p.z),screenY=.5+.5*p.y*(1./tan(mix(.3054326,.418879,uMobile)))/depth;
 float screenX=.5+.5*p.x*(1./tan(mix(.3054326,.418879,uMobile)))/depth*uResolution.y/uResolution.x;
 float gradient=cos(.7)*(screenY-.5)-sin(.7)*(screenX-.5)+.5;
 float alpha=.8*aExtra.x*phase(.8,1.,life)*ease(phase(.1,.5,uProgress))*uOpacity;
 alpha*=1.-smoothstep(.85,.90,uProgress);
 vColor=vec4(mix(vec3(.612,.914,1.),vec3(.027,0.,1.),sat(gradient)),alpha);
 project(p,4.*(1.+.5*aExtra.y)+20.7*pow(1.-sat(screenY),2.),vec2(0.));
}`;
  const outlineVertex=common+`
void main(){
 float z=fract(aPosition.z+uTime*.03+phase(.2,1.,uProgress)*1.6),life=pow(z,5.87);
 vec3 p=vec3(rotate(aPosition.xy,.07),z*15.9-15.9+10.*ease(phase(.7,1.,uProgress)));
 float alpha=life*aExtra.x*(1.-phase(.7,.85,life))*ease(phase(.15,.35,uProgress))*(1.-smoothstep(.85,.90,uProgress))*uOpacity;
 vColor=vec4(mix(vec3(1.087),vec3(.365,.733,1.)*1.63,pow(life,.75)),alpha);
 project(p,aExtra.y*1.5,vec2(0.));
}`;
  const gridVertex=common+`
uniform float uOffset,uVelocity,uTreatment,uQuantumZ;
void main(){
 vec3 p=aPosition;p.y=mod(p.y-uOffset,27.)-13.5;p.x=p.x*1.4+.7;p.z+=uQuantumZ;
 p.y+=22.*ease(phase(0.,.6,uTreatment));
 float velocity=pow(sat(abs(uVelocity)/.1),2.5),depth=max(.06,uCamera-p.z);
 vColor=vec4(1.,1.,1.,1.2*exp(-.0348*.0348*depth*depth)*uOpacity*(1.-smoothstep(.48,.96,uTreatment)));
 project(p,175.*(1.+velocity*10.),vec2(0.));
}`;
  const gridFragment=`precision highp float;varying vec4 vColor;uniform float uVelocity;void main(){float velocity=pow(clamp(abs(uVelocity)/.1,0.,1.),2.5);vec2 p=gl_PointCoord-.5;p.x*=1.+velocity*15.;float d=length(p);if(d>.5)discard;
 // Algebraic form of the reference's reversed smoothstep(.5,.5-velocity-.01,d).
 // Do not clamp the inner edge to zero: at speed it moves below zero, making
 // the entire stretched oval translucent rather than a solid white disk.
 float falloff=clamp((.5-d)/(velocity+.01),0.,1.);float alpha=falloff*falloff*(3.-2.*falloff);
 gl_FragColor=vec4(vColor.rgb,vColor.a*alpha*(1.-velocity*.1));}`;
  const trailVertex=common+`
uniform float uOffset,uVelocity,uTreatment,uQuantumZ;
void main(){
 float cycle=floor(uTime*(.8+uVelocity*5.)+aRandom.w*5.);
 float run=fract(uTime*(.8+uVelocity*5.)+aRandom.w*5.);
 vec3 start=aPosition,end=start+vec3(aExtra.x*4.,aExtra.y*4.,0.);
 float prog=1.-pow(1.-phase(0.,.7,run-aRandom.x*.5+aRandom.y*.1),3.);
 vec3 p=mix(start,end,prog);p.y=mod(p.y-uOffset,27.)-13.5;
 float vp=.4*ease(phase(.05,.95,uTreatment));
 float v=1.-pow(1.-phase(0.,.7,pow(vp,1.+aRandom.z)),3.);
 vec3 vs=start;vs.y=mod(vs.y-uOffset,27.)-13.5;
 vec3 target=vec3(0.,-24.5,-10.);vec3 axis=normalize(target-vs),right=normalize(cross(axis,vec3(0.,1.,0.))),up=cross(right,axis);
 float angle=(v*2.+uTime*.09)*6.283;
 vec3 vortex=mix(vs,target,v)+(right*cos(angle)+up*sin(angle))*.5*(1.-v)*phase(0.,.15,vp);
 float dist=length(target-vortex);vortex+=cross(normalize(target-vortex+vec3(.00001)),vec3(0.,1.,0.))*sin(dist*.5-uTime*.12)*phase(0.,.15,vp);
 p=mix(p,vortex,smoothstep(0.,.05,uTreatment));
 p.xy+=vec2(cos(uTime*2.4+aRandom.w*6.28)*(aRandom.y-.5),sin(uTime*2.4+aRandom.w*6.28)*(aRandom.z-.5))*.1*phase(.05,.1,vp);
 p.x=p.x*1.4+.7;p.y+=22.*ease(phase(0.,.6,uTreatment));p.z+=uQuantumZ;
 float alpha=.75*phase(0.,.1,run)*(1.-phase(.8,1.,run))*pow(run,.2);
 float vortexAlpha=.75*(1.+pow(vp,.15)*4.)*(1.+cos(uTime*6.+aRandom.w*6.))*(1.-phase(0.,.05,.05-vp));
 alpha=mix(alpha,vortexAlpha,smoothstep(0.,.05,uTreatment));
 float depth=max(.06,uCamera-p.z);alpha*=exp(-.0348*.0348*depth*depth)*uOpacity*(1.-smoothstep(.48,.96,uTreatment));
 vColor=vec4(mix(vec3(.027,0.,1.),vec3(.612,.914,1.),mix(prog,v,smoothstep(0.,.05,uTreatment))),alpha);
 project(p,25.,vec2(0.));
}`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  function program(v,f=fragment){const p=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,v),fs=shader(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return{p,uniforms:new Map(),attributes:['aPosition','aRandom','aExtra'].map(n=>gl.getAttribLocation(p,n))};}
  function uniform(p,n,...v){if(!p.uniforms.has(n))p.uniforms.set(n,gl.getUniformLocation(p.p,n));const l=p.uniforms.get(n);if(l===null)return;v.length===2?gl.uniform2f(l,...v):gl.uniform1f(l,v[0]);}
  function buffer(values){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);return{buffer:b,count:values.length/11};}
  function push(a,pos,random,extra){a.push(...pos,...random,...extra);}
  async function init(){
    seed=4357;ready=false;
    const [head,outline]=await Promise.all(['head-particles','head-outline'].map(async n=>{const response=await fetch('assets/aleph/'+n+'.json');if(!response.ok)throw Error(n+' '+response.status);return response.json();}));
    const mobile=innerWidth<700,hs=[],cloud=[],ol=[],grid=[],trails=[];
    for(let i=0;i<head.length;i+=mobile?10:5)push(hs,[(head[i]*3-1.5)*1.015,(1-head[i+1])*3*1.015-1.7,0],[rand(),rand(),rand(),rand()],[head[i+2],head[i+3],head[i+4],1]);
    const count=mobile?28000:70000;
    for(let i=0;i<count;i++){
      const f=i/count;let angle=rand()*Math.PI*2,r=(1-rand()*rand()*rand()*rand())*.5;
      if(f>.9){angle=Math.PI*1.05+rand()*Math.PI*.05;r=.5-rand()*.05;}else if(f>.75){angle=Math.PI*1.8+rand()*Math.PI*.1;r=.5-rand()*.01;}else if(f>.55){angle=Math.PI*1.3;r=.75-rand()*.3;}else if(f>.5){angle=Math.PI*.4+rand()*Math.PI*.01;r=.75-rand()*.1;}else if(f>.45){angle=Math.PI*.8+rand()*Math.PI*.01;r=.75-rand()*.1;}
      push(cloud,[Math.cos(angle)*r,Math.sin(angle)*r,0],[rand(),rand(),rand(),rand()],[rand(),rand(),rand(),rand()]);
    }
    for(let j=0;j<14;j++)for(let i=0;i<outline.length;i+=2){const x=outline[i]-.5,y=.5-outline[i+1],alpha=ramp(.15,.3,y+.5)*ramp(.2,.22,Math.hypot(x,y));push(ol,[x*638/676,y,j/14],[0,0,0,0],[alpha,i<250?6.1:3.3,0,0]);}
    for(let z=0;z<11;z++)for(let y=0;y<7;y++)for(let x=0;x<6;x++)push(grid,[x*4-10.5,y*4-13.5,-z*4.5],[0,0,0,0],[0,0,0,0]);
    for(let i=0;i<60;i++){const pos=[Math.floor(rand()*6)*4-10.5,Math.floor(rand()*7)*4-13.5,-Math.floor(rand()*11)*4.5],end=[Math.floor(rand()*3)-1,Math.floor(rand()*3)-1],offset=rand(),trailCount=mobile?100:300;for(let j=0;j<trailCount;j++)push(trails,pos,[j/trailCount,rand(),rand(),offset],[end[0],end[1],rand(),rand()]);}
    sets={head:buffer(hs),cloud:buffer(cloud),outline:buffer(ol),grid:buffer(grid),trails:buffer(trails)};
    programs={head:program(headVertex),cloud:program(cloudVertex),outline:program(outlineVertex),grid:program(gridVertex,gridFragment),trails:program(trailVertex)};
    canvas.dataset.renderer='webgl';canvas.dataset.tunnelParticles=String(count);canvas.dataset.headParticles=String(hs.length/11);canvas.dataset.gridNodes=String(grid.length/11);canvas.dataset.trailParticles=String(trails.length/11);ready=true;
  }
  function fail(e){ready=false;canvas.dataset.renderer='fallback';canvas.style.opacity='0';console.warn('Journey particle fallback:',e.message);}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;api.hide();});canvas.addEventListener('webglcontextrestored',()=>{lost=false;init().catch(fail);});
  let oldOffset=-1.5,velocity=0;
  function render({twinProgress=0,circuitProgress=0,treatmentProgress=0,time=0,mouse={x:0,y:0},reduced=false,paused=false,twinOpacity=0,circuitOpacity=0,treatmentOpacity=0}){
    if(!api.ready)return false;
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,width<700?1.25:1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
    pointer[0]+=(mouse.x-pointer[0])*.08;pointer[1]+=(mouse.y-pointer[1])*.08;
    canvas.style.opacity='1';gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    const tp=clamp(twinProgress),cp=clamp(circuitProgress),tr=clamp(treatmentProgress),clock=reduced?0:time;
    const camera=tp<.7?5-4.9*ease(ramp(0,.28,tp)):.1-10.1*ease(ramp(.7,1,tp));
    const quantumAlpha=Math.max(twinOpacity*ramp(.79,.84,tp)*(1-ramp(.99,1,tp)),circuitOpacity,treatmentOpacity);
    const offset=-1.5-54*ease(ramp(.05,1,cp));
    const delta=Math.abs(offset-oldOffset);oldOffset=offset;velocity+=(Math.min(.2,delta*.667)-velocity)*.1;if(paused||reduced)velocity=0;
    const vars={uResolution:[width,height],uPointer:paused||reduced?[0,0]:pointer,uDpr:[dpr],uTime:[clock],uMobile:[width<700?1:0],uReduced:[reduced?1:0]};
    function draw(name,progress,opacity,cam,extra={}){if(opacity<=.001)return;const p=programs[name],b=sets[name];gl.useProgram(p.p);gl.blendFunc(gl.SRC_ALPHA,name==='head'?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);for(const [k,v]of Object.entries({...vars,uProgress:[progress],uOpacity:[opacity],uCamera:[cam],...extra}))uniform(p,k,...v);gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);const sizes=[3,4,4],offsets=[0,12,28];p.attributes.forEach((a,i)=>{if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,sizes[i],gl.FLOAT,false,44,offsets[i]);}});gl.drawArrays(gl.POINTS,0,b.count);p.attributes.forEach(a=>{if(a>=0)gl.disableVertexAttribArray(a);});}
    if(twinOpacity>0){draw('head',tp,twinOpacity,camera);draw('cloud',tp,twinOpacity,camera);draw('outline',tp,twinOpacity,camera);}
    if(quantumAlpha>0){const inTwin=circuitOpacity<.001&&treatmentOpacity<.001;const z=inTwin?-40+30*ease(ramp(.79,.87,tp)):-10;const cam=inTwin?camera:-10;const extras={uOffset:[offset],uVelocity:[velocity],uTreatment:[treatmentOpacity>0?tr:0],uQuantumZ:[z]};draw('grid',cp,quantumAlpha,cam,extras);draw('trails',cp,quantumAlpha,cam,extras);}
    canvas.dataset.phase=[tp,cp,tr].map(v=>v.toFixed(3)).join(',');return true;
  }
  init().catch(fail);
})();
