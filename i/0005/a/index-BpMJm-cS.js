import*as e from"three";import{BackSide as t,BoxGeometry as n,BufferAttribute as r,BufferGeometry as i,InstancedMesh as a,Mesh as o,MeshLambertMaterial as s,MeshStandardMaterial as c,Object3D as l,PointLight as u,Scene as d}from"three";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function f({canvas:t,antialias:n=!0,pixelRatioMax:r=2,shadows:i=!0,toneMapping:a=e.ACESFilmicToneMapping,toneMappingExposure:o=1,logarithmicDepthBuffer:s=!1}){let c=new e.WebGLRenderer({canvas:t,antialias:n,alpha:!1,powerPreference:`high-performance`,stencil:!1,logarithmicDepthBuffer:s});c.setPixelRatio(Math.min(window.devicePixelRatio,r));let l=t.parentElement??document.body;return c.setSize(l.clientWidth,l.clientHeight,!1),c.outputColorSpace=e.SRGBColorSpace,c.toneMapping=a,c.toneMappingExposure=o,i&&(c.shadowMap.enabled=!0,c.shadowMap.type=e.PCFSoftShadowMap),c}function p(e,t,n,r){let i=new ResizeObserver(n=>{let i=n[0];if(!i)return;let{width:a,height:o}=i.contentRect;if(e.setSize(a,o,!1),t.isPerspectiveCamera){let e=t;e.aspect=a/o,e.updateProjectionMatrix()}r?.(a,o)});return i.observe(n.parentElement??document.body),()=>i.disconnect()}var m=new class{constructor(){this._syncCallbacks=new Set,this._asyncCallbacks=new Set,this._listeners=new Set,this._animationFrameId=null,this._lastFrameTime=performance.now(),this._elapsedTimeAccumulator=0,this.totalTime=0,this.deltaTime=0,this.isPaused=!0,this._fixedFrameRate=0,this._msPerFrame=0,this._loop=this._loop.bind(this)}setFixedFrameRate(e){this._fixedFrameRate=e,this._msPerFrame=e>0?1e3/e:0,this._notify()}getFramerate(){return this._fixedFrameRate}registerSyncCallback(e){this._syncCallbacks.add(e),this._manageLoop()}unregisterSyncCallback(e){this._syncCallbacks.delete(e),this._manageLoop()}registerAsyncCallback(e){this._asyncCallbacks.add(e),this._manageLoop()}unregisterAsyncCallback(e){this._asyncCallbacks.delete(e),this._manageLoop()}resume(){this.isPaused&&(this.isPaused=!1,this._lastFrameTime=performance.now(),this._notify())}pause(){this.isPaused||(this.isPaused=!0,this._notify())}reset(){this.totalTime=0,this.deltaTime=0,this.isPaused=!0,this._elapsedTimeAccumulator=0,this._lastFrameTime=performance.now(),this._notify()}subscribe(e){return this._listeners.add(e),()=>this._listeners.delete(e)}_notify(){this._listeners.forEach(e=>e())}_manageLoop(){let e=this._syncCallbacks.size>0||this._asyncCallbacks.size>0;e&&this._animationFrameId===null?this._start():!e&&this._animationFrameId!==null&&this._stop()}_start(){this._animationFrameId===null&&(this._lastFrameTime=performance.now(),this._animationFrameId=requestAnimationFrame(this._loop))}_stop(){this._animationFrameId!==null&&(cancelAnimationFrame(this._animationFrameId),this._animationFrameId=null)}_loop(e){if(this._animationFrameId=requestAnimationFrame(this._loop),this.isPaused)return;let t=e-this._lastFrameTime;if(this._lastFrameTime=e,this._elapsedTimeAccumulator+=t,this._msPerFrame>0&&this._elapsedTimeAccumulator<this._msPerFrame)return;let n=t;this._msPerFrame>0&&(n=this._msPerFrame,this._elapsedTimeAccumulator-=this._msPerFrame),this.deltaTime=n/1e3,this.totalTime+=this.deltaTime,this._syncCallbacks.forEach(e=>e(this)),this._asyncCallbacks.forEach(e=>Promise.resolve().then(()=>e(this)))}};function h(e){return`
const handler = (${e});
let state;
self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    state = msg.state;
    return;
  }
  if (msg.type !== 'tick')
    return;
  try {
    const next = handler(msg.ctx, state);
    if (next !== undefined)
      state = next;
    self.postMessage({ type: 'result', frame: msg.ctx.frame, state });
  }
  catch (err) {
    self.postMessage({
      type: 'error',
      frame: msg.ctx.frame,
      message: String(err && err.message || err),
      stack: err && err.stack || '',
    });
  }
};
`}function g(e){let t=e.toString();if(t.includes(`[native code]`))throw Error(`registerWorkerUpdate: handler is a native or bound function and cannot be serialized — pass a plain, self-contained function expression`);if(!/^\s*(?:async\s+)?(?:function\b|\()/.test(t)&&!/^\s*(?:async\s+)?[\w$]+\s*=>/.test(t))throw Error(`registerWorkerUpdate: handler must be a function expression or arrow function (object method shorthand does not serialize) — it is rehydrated inside a worker and must be self-contained`);return t}var _=!1;function v(e,t={},n={}){let r=g(e),i=t.onError??(e=>{console.error(`registerWorkerUpdate:`,e)}),a=!1,o=null,s=!1,c=null,l=``,u=!1,d=()=>{!u&&l&&(u=!0,URL.revokeObjectURL(l))};if(!n.forceFallback&&typeof Worker<`u`&&typeof URL<`u`&&typeof URL.createObjectURL==`function`)try{l=URL.createObjectURL(new Blob([h(r)],{type:`text/javascript`})),c=new Worker(l,{type:`module`}),c.postMessage({type:`init`,state:t.initialState}),c.onmessage=e=>{d();let n=e.data;a=!1,n?.type===`result`?t.onResult?.(n.state):n?.type===`error`&&i(Error(`worker update handler threw: ${n.message}${n.stack?`\n${n.stack}`:``}`)),v()},c.onerror=e=>{d(),a=!1,i(Error(`worker update failed: ${e.message||`unknown worker error`}`))},c.onmessageerror=()=>{a=!1,i(Error(`worker update: message could not be deserialized`))}}catch(e){d(),c=null,_||(_=!0,console.warn(`registerWorkerUpdate: Worker construction failed, falling back to same-thread microtasks`,e))}let f=t.initialState;function p(n){queueMicrotask(()=>{if(!s){try{let r=e(n,f);r!==void 0&&(f=r),a=!1,t.onResult?.(f)}catch(e){a=!1,i(e instanceof Error?e:Error(String(e)))}v()}})}function m(e){if(a=!0,c)try{c.postMessage({type:`tick`,ctx:e})}catch(e){a=!1,i(e instanceof Error?e:Error(String(e)))}else p(e)}function v(){if(s||a||!o)return;let e=o;o=null,m(e)}return{tick(e){s||(a?o={delta:(o?.delta??0)+e.delta,elapsed:e.elapsed,frame:e.frame}:m({delta:e.delta,elapsed:e.elapsed,frame:e.frame}))},terminate(){s||(s=!0,o=null,a=!1,d(),c?.terminate(),c=null)}}}function y({clock:e,fps:t}={}){let n=new Set,r=new Set,i=0,a=0,o=!1;t!==void 0&&m.setFixedFrameRate(t);function s(){let t=m.deltaTime;if(e)for(let r of e.advance(t)){i+=1;let t=e.elapsed();for(let e of n)e({delta:r,elapsed:t,frame:i})}else{i+=1,a+=t;for(let e of n)e({delta:t,elapsed:a,frame:i})}}function c(){o||(o=!0,m.registerSyncCallback(s),m.resume())}function l(){o&&(o=!1,m.unregisterSyncCallback(s))}function u(e){return n.add(e),o||c(),()=>{n.delete(e)}}function d(e){return u(e)}function f(e){n.delete(e)}function p(e,t){let n=v(e,t);r.add(n);let i=u(e=>n.tick(e));return{unregister:i,terminate(){i(),n.terminate(),r.delete(n)}}}function h(){l(),n.clear();for(let e of r)e.terminate();r.clear(),i=0,a=0}return{onFrame:u,registerUpdate:d,unregisterUpdate:f,registerWorkerUpdate:p,start:c,stop:l,dispose:h}}function b(e,t,{tapThresholdMs:n=250,tapMovePx:r=8}={}){let i=new Map,a=0,o=0,s=0,c=0;e.style.touchAction=`none`;let l=t=>{if(e.setPointerCapture(t.pointerId),i.set(t.pointerId,{x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY}),i.size===1)o=performance.now(),s=t.clientX,c=t.clientY;else if(i.size===2){let[e,t]=[...i.values()];e&&t&&(a=Math.hypot(e.x-t.x,e.y-t.y))}},u=e=>{let n=i.get(e.pointerId);if(n){if(n.lastX=n.x,n.lastY=n.y,n.x=e.clientX,n.y=e.clientY,i.size===1&&t.onDrag)t.onDrag(n.x-n.lastX,n.y-n.lastY,e);else if(i.size===2&&t.onPinch){let[e,n]=[...i.values()];if(!e||!n)return;let r=Math.hypot(e.x-n.x,e.y-n.y),o=(e.x+n.x)/2,s=(e.y+n.y)/2;a>0&&t.onPinch(r/a,o,s),a=r}}},d=e=>{let l=i.get(e.pointerId);if(i.delete(e.pointerId),i.size<2&&(a=0),l&&i.size===0&&t.onTap){let i=performance.now()-o,a=Math.hypot(l.x-s,l.y-c);i<n&&a<r&&t.onTap(l.x,l.y,e)}},f=e=>{t.onWheel&&(e.preventDefault(),t.onWheel(e.deltaY,e))};return e.addEventListener(`pointerdown`,l),e.addEventListener(`pointermove`,u),e.addEventListener(`pointerup`,d),e.addEventListener(`pointercancel`,d),e.addEventListener(`wheel`,f,{passive:!1}),()=>{e.removeEventListener(`pointerdown`,l),e.removeEventListener(`pointermove`,u),e.removeEventListener(`pointerup`,d),e.removeEventListener(`pointercancel`,d),e.removeEventListener(`wheel`,f)}}function x(e){return!!(e&&typeof e==`object`&&`minFilter`in e&&typeof e.dispose==`function`)}function S(e){for(let t in e){let n=e[t];x(n)&&n.dispose()}let t=e;if(t.uniforms)for(let e in t.uniforms){let n=t.uniforms[e]?.value;x(n)&&n.dispose()}e.dispose()}function ee(e){e.traverse(e=>{let t=e;if(t.geometry&&t.geometry.dispose(),t.material){let e=Array.isArray(t.material)?t.material:[t.material];for(let t of e)S(t)}})}function C({mode:e=`wall`,step:t=1/60,maxSubSteps:n=5}={}){let r=0,i=0,a=[];function o(o){if(a.length=0,e===`wall`)return i+=o,a.push(o),a;for(r+=o;r>=t&&a.length<n;)r-=t,i+=t,a.push(t);return a.length>=n&&(r=0),a}return{mode:e,advance:o,elapsed:()=>i,reset(){r=0,i=0}}}function te(e,t){let n=e,r=new Set;function i(e){if(e===n)return;let t=n;n=e;for(let e of r)e(n,t)}return{get:()=>n,set(e){i({...n,...e})},dispatch(e){if(!t)throw Error(`createStore.dispatch: store has no reducer`);i(t(n,e))},subscribe(e){return r.add(e),()=>{r.delete(e)}}}}var w=class extends d{constructor(){super(),this.name=`RoomEnvironment`,this.position.y=-3.5;let e=new n;e.deleteAttribute(`uv`);let r=new c({side:t}),i=new c,s=new u(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let d=new o(e,r);d.position.set(-.757,13.219,.717),d.scale.set(31.713,28.305,28.591),this.add(d);let f=new a(e,i,6),p=new l;p.position.set(-10.906,2.009,1.846),p.rotation.set(0,-.195,0),p.scale.set(2.328,7.905,4.651),p.updateMatrix(),f.setMatrixAt(0,p.matrix),p.position.set(-5.607,-.754,-.758),p.rotation.set(0,.994,0),p.scale.set(1.97,1.534,3.955),p.updateMatrix(),f.setMatrixAt(1,p.matrix),p.position.set(6.167,.857,7.803),p.rotation.set(0,.561,0),p.scale.set(3.927,6.285,3.687),p.updateMatrix(),f.setMatrixAt(2,p.matrix),p.position.set(-2.017,.018,6.124),p.rotation.set(0,.333,0),p.scale.set(2.002,4.566,2.064),p.updateMatrix(),f.setMatrixAt(3,p.matrix),p.position.set(2.291,-.756,-2.621),p.rotation.set(0,-.286,0),p.scale.set(1.546,1.552,1.496),p.updateMatrix(),f.setMatrixAt(4,p.matrix),p.position.set(-2.193,-.369,-5.547),p.rotation.set(0,.516,0),p.scale.set(3.875,3.487,2.986),p.updateMatrix(),f.setMatrixAt(5,p.matrix),this.add(f);let m=new o(e,T(50));m.position.set(-16.116,14.37,8.208),m.scale.set(.1,2.428,2.739),this.add(m);let h=new o(e,T(50));h.position.set(-16.109,18.021,-8.207),h.scale.set(.1,2.425,2.751),this.add(h);let g=new o(e,T(17));g.position.set(14.904,12.198,-1.832),g.scale.set(.15,4.265,6.331),this.add(g);let _=new o(e,T(43));_.position.set(-.462,8.89,14.52),_.scale.set(4.38,5.441,.088),this.add(_);let v=new o(e,T(20));v.position.set(3.235,11.486,-12.541),v.scale.set(2.5,2,.1),this.add(v);let y=new o(e,T(100));y.position.set(0,20,0),y.scale.set(1,.1,1),this.add(y)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function T(e){return new s({color:0,emissive:16777215,emissiveIntensity:e})}function E(t,n,{intensity:r=1,envScene:i}={}){let a=new e.PMREMGenerator(n),o=i??new w,s=a.fromScene(o,.04).texture;return t.environment=s,t.environmentIntensity=r,a.dispose(),i||o.traverse(e=>e.geometry?.dispose()),s}function D({color:t=`#fff5e0`,intensity:n=3,position:r=new e.Vector3(8,12,6),shadowMapSize:i=2048,shadowFrustum:a=15,shadowFar:o=30}={}){let s=new e.DirectionalLight(t,n);return s.position.copy(r),s.castShadow=!0,s.shadow.mapSize.set(i,i),s.shadow.camera.near=1,s.shadow.camera.far=o,s.shadow.camera.top=a,s.shadow.camera.right=a,s.shadow.camera.bottom=-a,s.shadow.camera.left=-a,s.shadow.bias=-1e-4,s.shadow.normalBias=.02,s}function O({skyColor:t=`#a0c0ff`,groundColor:n=`#3a2a1a`,intensity:r=.4}={}){return new e.HemisphereLight(t,n,r)}function k(e,t,n={}){let r=E(e,t,n.env),i=D(n.sun),a=O(n.hemi);return e.add(i,i.target,a),{env:r,sun:i,hemi:a,dispose(){r.dispose(),e.remove(i,i.target,a)}}}function A(e){let t=e>>>0;return function(){t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function j(e,t,n){let r=Math.max(0,Math.min(1,(n-e)/(t-e)));return r*r*(3-2*r)}function M(e,t){let n=(2166136261^t)>>>0;for(let t=0;t<e.length;t++)n^=e.charCodeAt(t),n=Math.imul(n,16777619);return n>>>0}function N(e){let t=e>>>0,n=A(t);return{next:n,range(e,t){return e+n()*(t-e)},int(e,t){return Math.floor(e+n()*(t-e+1))},pick(e){if(e.length===0)throw Error(`createSeededRng.pick: empty array`);return e[Math.floor(n()*e.length)]},fork(e){return N(M(e,t))}}}function P({canvas:t,state:n={},reducer:r,seed:i=1,clock:a=C(),renderer:o,camera:s,background:c=`#0a0a14`,lighting:l=!0,orbit:u=!0,modules:d=[],onFrame:m,onResize:h,render:g}){if(!t)throw Error(`createApp: canvas required`);let _=f({canvas:t,...o}),v=new e.Scene;v.background=new e.Color(c);let x;if(s instanceof e.Camera)x=s;else{let n=t.clientWidth/t.clientHeight||1,r=new e.PerspectiveCamera(s?.fov??50,n,s?.near??.1,s?.far??200);r.position.set(...s?.position??[4,3,6]),r.lookAt(new e.Vector3(...s?.lookAt??[0,0,0])),x=r}let S=l?k(v,_):null,w=te(n,r),T=N(i),E=y(),D={scene:v,camera:x,renderer:_,rng:T,loop:E},O=null;if(u){let e=Math.atan2(x.position.x,x.position.z),n=Math.atan2(x.position.y,Math.hypot(x.position.x,x.position.z)),r=x.position.length(),i=()=>{let t=r*Math.cos(n);x.position.set(Math.sin(e)*t,Math.sin(n)*r,Math.cos(e)*t),x.lookAt(0,0,0)};O=b(t,{onDrag(t,r){e-=t*.005,n=Math.max(-1.4,Math.min(1.4,n+r*.005)),i()},onPinch(e){r=Math.max(2,Math.min(50,r/e)),i()},onWheel(e){r=Math.max(2,Math.min(50,r*(1+e*.001))),i()}})}let A=p(_,x,t,h);for(let e of d)e.build(D);_.compile(v,x);let j=0;function M(e){j+=1;let t={delta:e,elapsed:a.elapsed(),frame:j},n=w.get();for(let e of d)e.update?.(n,t,D);m?.(n,t,D)}function P(e){for(let t of a.advance(e))M(t);g?g():_.render(v,x)}let ne=E.onFrame(({delta:e})=>P(e));return E.stop(),{ctx:D,store:w,getState:w.get,setState:e=>w.set(e),dispatch:e=>w.dispatch(e),tick(e=1/60){P(e)},start:()=>E.start(),stop:()=>E.stop(),dispose(){ne(),E.dispose(),O?.(),A(),S?.dispose();for(let e of d)e.dispose();ee(v),_.dispose()}}}function ne(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),a=new Set(Object.keys(e[0].morphAttributes)),o={},s={},c=e[0].morphTargetsRelative,l=new i,u=0;for(let i=0;i<e.length;++i){let d=e[i],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. Make sure all geometries have the same number of attributes.`),null;if(c!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!a.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`.  .morphAttributes must be consistent throughout all geometries.`),null;s[e]===void 0&&(s[e]=[]),s[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. The geometry must have either an index or a position attribute`),null;l.addGroup(u,e,i),u+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}l.setIndex(n)}for(let e in o){let t=re(o[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;l.setAttribute(e,t)}for(let e in s){let t=s[e][0].length;if(t!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<s[e].length;++r)t.push(s[e][r][n]);let r=re(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;l.morphAttributes[e].push(r)}}}return l}function re(e){let t,n,i,a=-1,o=0;for(let r=0;r<e.length;++r){let s=e[r];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(i===void 0&&(i=s.normalized),i!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(a===-1&&(a=s.gpuType),a!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;o+=s.count*n}let s=new t(o),c=new r(s,n,i),l=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=l/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);c.setComponent(t+e,i,n)}}else s.set(r.array,l);l+=r.count*n}return a!==void 0&&(c.gpuType=a),c}var ie=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];function F(e=1){let t=A(e>>>0),n=new Uint8Array(256);for(let e=0;e<256;e++)n[e]=e;for(let e=255;e>0;e--){let r=Math.floor(t()*(e+1)),i=n[e];n[e]=n[r],n[r]=i}let r=new Uint8Array(512);for(let e=0;e<512;e++)r[e]=n[e&255];let i=1/6;function a(e,t,n,r){return e[0]*t+e[1]*n+e[2]*r}function o(e,t,n){let o=(e+t+n)*.3333333333333333,s=Math.floor(e+o),c=Math.floor(t+o),l=Math.floor(n+o),u=(s+c+l)*i,d=e-(s-u),f=t-(c-u),p=n-(l-u),m=0,h=0,g=0,_=0,v=0,y=0;d>=f?f>=p?(m=1,_=1,v=1):d>=p?(m=1,_=1,y=1):(g=1,_=1,y=1):f<p?(g=1,v=1,y=1):d<p?(h=1,v=1,y=1):(h=1,_=1,v=1);let b=d-m+i,x=f-h+i,S=p-g+i,ee=d-_+2*i,C=f-v+2*i,te=p-y+2*i,w=d-1+3*i,T=f-1+3*i,E=p-1+3*i,D=s&255,O=c&255,k=l&255,A=0,j=.6-d*d-f*f-p*p;if(j>0){j*=j;let e=r[D+r[O+r[k]]]%12;A+=j*j*a(ie[e],d,f,p)}let M=.6-b*b-x*x-S*S;if(M>0){M*=M;let e=r[D+m+r[O+h+r[k+g]]]%12;A+=M*M*a(ie[e],b,x,S)}let N=.6-ee*ee-C*C-te*te;if(N>0){N*=N;let e=r[D+_+r[O+v+r[k+y]]]%12;A+=N*N*a(ie[e],ee,C,te)}let P=.6-w*w-T*T-E*E;if(P>0){P*=P;let e=r[D+1+r[O+1+r[k+1]]]%12;A+=P*P*a(ie[e],w,T,E)}return 32*A}function s(e,t,n,r=4,i=2,a=.5){let s=0,c=.5,l=1;for(let u=0;u<r;u++)s+=c*o(e*l,t*l,n*l),l*=i,c*=a;return s}function c(e,t,n,r=4,i=2,a=.5){let s=0,c=.5,l=1;for(let u=0;u<r;u++)s+=c*(1-Math.abs(o(e*l,t*l,n*l))),l*=i,c*=a;return s}return{sample:o,fbm:s,ridged:c}}var ae={mobile:{pixelRatio:1.5,shadowMapSize:1024,shadowsEnabled:!0,postFx:[`bloom`],chunkViewRadius:2,particleBudget:5e3,maxLights:2},desktop:{pixelRatio:2,shadowMapSize:2048,shadowsEnabled:!0,postFx:[`bloom`,`dof`,`filmGrain`],chunkViewRadius:4,particleBudget:5e4,maxLights:4},highEnd:{pixelRatio:2,shadowMapSize:4096,shadowsEnabled:!0,postFx:[`bloom`,`dof`,`godRays`,`filmGrain`,`glitch`],chunkViewRadius:6,particleBudget:25e4,maxLights:8}};function oe(){let e=navigator.maxTouchPoints>0&&window.innerWidth<1280,t=navigator.hardwareConcurrency||4,n=window.devicePixelRatio||1;return e||t<=4?`mobile`:t>=8&&n>=2?`highEnd`:`desktop`}function se(e=oe()){return{tier:e,...ae[e]}}var I=[{name:`hero`,at:[84,104],height:5,look:[6,34],lookHeight:12},{name:`summit`,at:[2,86],height:28,look:[28,-40],lookHeight:4},{name:`shore`,at:[-96,44],height:2.6,look:[-24,-6],lookHeight:7},{name:`cove`,at:[-38,-104],height:4.5,look:[4,-12],lookHeight:9},{name:`ridge`,at:[8,-34],height:13,look:[58,62],lookHeight:3}];function ce(e,t,n){return Math.max(e.heightAt(t,n),e.waterLevel)}function le(e,t){let[n,r]=e.at,[i,a]=e.look;return{position:[n,ce(t,n,r)+e.height,r],target:[i,ce(t,i,a)+e.lookHeight,a]}}function ue(e){return I.find(t=>t.name===e)}function de(e,t,n){let r=e.onBeforeCompile,i=e.customProgramCacheKey;e.onBeforeCompile=function(e,t){r.call(this,e,t),n(e)},e.customProgramCacheKey=function(){return`${i.call(this)}+${t}`}}function L(e,t,n){if(!e.includes(t))throw Error(`the shader has no "${t}" to add after`);return e.replace(t,`${t}\n${n}`)}var R=new e.Vector3(-.62,.46,.3).normalize(),z=2e3,B=-1.2,fe=7,pe=1470,me=Math.PI*2,he=[{x:12,z:-31,weight:.5,phase:0},{x:28,z:-52,weight:.3,phase:1.3},{x:8,z:5,weight:.2,phase:4.1}],V=`
  #ifndef WIND_GLSL
  #define WIND_GLSL

  uniform vec2 uWindDrift;

  const float WEATHER_SPAN = ${H(z)};
  const vec2  WIND         = vec2(${Math.cos(B)}, ${Math.sin(B)});

  // A place, in the air's own frame: where the air now here started from, as
  // an angle that goes round once across the span.
  vec2 windFrame (vec2 at) {
    return (at - uWindDrift) * ${me/z};
  }

  // 0 in a lull, 1 in a gust.
  float windGust (vec2 at) {
    vec2 air = windFrame(at);

    return 0.5 + 0.5 * (${he.map(e=>`${H(e.weight)} * sin(dot(air, vec2(${H(e.x)}, ${H(e.z)})) + ${H(e.phase)})`).join(` + `)});
  }

  #endif
`;function H(e){return Number.isInteger(e)?e.toFixed(1):String(e)}function ge(e,t){return(e%t+t)%t}function _e(){let t=[Math.cos(B),Math.sin(B)],n={uWindDrift:{value:new e.Vector2}};return{direction:t,speed:fe,uniforms:n,blow(e){let r=fe*(e+pe);n.uWindDrift.value.set(ge(t[0]*r,z),ge(t[1]*r,z))},gustAt(e,n,r){let i=fe*(r+pe),a=(e-t[0]*i)*me/z,o=(n-t[1]*i)*me/z,s=0;for(let e of he)s+=e.weight*Math.sin(a*e.x+o*e.z+e.phase);return .5+.5*s}}}var ve=.68,ye=.22,be=.3,xe=1.7,Se=[.42,.58],U=[R.x/R.y,R.z/R.y],W=`
  uniform sampler2D uCloudShadow;

  // Where in the picture of the sky to look for a point in the world: up the
  // sun's ray to the height the clouds ride at, then back to where the air
  // that is there now started from.
  vec2 cloudShadowUv (vec3 at) {
    vec2 under = at.xz + vec2(${U[0]}, ${U[1]}) * (${120 .toFixed(1)} - at.y);

    return (under - uWindDrift) / WEATHER_SPAN + 0.5;
  }

  // How much of the sun gets through: 1 in the open, less under a cloud.
  float cloudLight (vec2 uv) {
    return 1.0 - ${ve} * smoothstep(${Se[0]}, ${Se[1]}, texture2D(uCloudShadow, uv).r);
  }
`;function Ce(){return{uniforms:{uCloudShadow:{value:null}}}}function we(e,t){let n=new Uint8Array(t*t),r=z/t,i=z/2;for(let a of e){let e=a.x+U[0]*(120-a.y),o=a.z+U[1]*(120-a.y),s=Math.ceil(a.radius*xe/r),c=Math.floor((e+i)/r),l=Math.floor((o+i)/r);for(let u=l-s;u<=l+s;u+=1)for(let l=c-s;l<=c+s;l+=1){let s=Math.hypot((l+.5)*r-i-e,(u+.5)*r-i-o),c=Math.round(255*(1-(s/a.radius-be)/1.4)),d=(u%t+t)%t*t+(l%t+t)%t;n[d]=Math.max(n[d],Math.min(255,c))}}return n}function Te(t,n){let r=new e.DataTexture(we(t,n),n,n,e.RedFormat,e.UnsignedByteType);return r.name=`cloud-shadow`,r.wrapS=e.RepeatWrapping,r.wrapT=e.RepeatWrapping,r.magFilter=e.LinearFilter,r.minFilter=e.LinearFilter,r.needsUpdate=!0,r}function Ee(e,{wind:t,clouds:n}){de(e,`cloud-shadow`,e=>{Object.assign(e.uniforms,t.uniforms,n.uniforms),e.vertexShader=L(L(e.vertexShader,`#include <common>`,`${V}${W}varying vec2 vCloudUv;`),`#include <project_vertex>`,`
        vec4 cloudAt = vec4(transformed, 1.0);

        #ifdef USE_INSTANCING
          cloudAt = instanceMatrix * cloudAt;
        #endif

        vCloudUv = cloudShadowUv((modelMatrix * cloudAt).xyz);
      `),e.fragmentShader=L(L(e.fragmentShader,`#include <common>`,`${V}${W}varying vec2 vCloudUv;`),`#include <lights_fragment_end>`,`
        float cloudLit = cloudLight(vCloudUv);

        reflectedLight.directDiffuse   *= cloudLit;
        reflectedLight.directSpecular  *= cloudLit;
        reflectedLight.indirectDiffuse *= mix(1.0, cloudLit, ${ye});
      `)})}var De=7,G=.5;function Oe({seed:e,size:t=260,relief:n=40,waterLevel:r=0}){let i=F(e),a=t/2;function o(e,t){let o=1-j(.3,.98,Math.hypot(e,t)/a),s=i.fbm(e*.011,.5,t*.011,4),c=i.ridged(e*.0055,3.7,t*.0055,3);return r+(.2+.42*s+.78*c*c)*n*o-De*(1-o)}function s(e,t){let n=o(e+G,t)-o(e-G,t),r=o(e,t+G)-o(e,t-G);return 1-2*G/Math.hypot(n,2*G,r)}return{size:t,relief:n,waterLevel:r,heightAt:o,slopeAt:s}}var K=1/60,ke=20261123;function Ae({seed:e,quality:t}){return{seed:e,quality:t,ground:Oe({seed:e}),wind:_e(),clouds:Ce()}}var je=4;function Me(e){return e instanceof Error?e.message:String(e)}function Ne({app:t,rig:n,painter:r,canvas:i,capturing:a}){let o=[],s=()=>void 0,c=e=>void 0,l=new Promise((e,t)=>{s=e,c=t});l.catch(()=>void 0),window.addEventListener(`error`,e=>o.push(e.message)),window.addEventListener(`unhandledrejection`,e=>o.push(Me(e.reason)));async function u({view:o=`hero`,t:s=10,width:c,height:u,type:d=`image/png`,quality:f,warmup:p=je}){if(!a)throw Error(`capture needs the page loaded with ?harness=1`);await l;let m=Math.round(s/K);if(r.frame>m)throw Error(`second ${s} has passed (the world is at step ${r.frame}) · reload to capture an earlier moment`);let{renderer:h,camera:g}=t.ctx;for(h.setPixelRatio(1),h.setSize(c,u,!1),g instanceof e.PerspectiveCamera&&(g.aspect=c/u,g.updateProjectionMatrix()),n.pin(o),r.hold=!0;r.frame<m;)t.tick(K);r.hold=!1,n.place(g);for(let e=0;e<p;e+=1)r.paint();return r.paint(),i.toDataURL(d,f)}return window.__SCENERY__={contract:1,ready:l,views:I.map(e=>e.name),capture:u,pose:()=>n.pose(),errors:o},{ready(){window.__SCENE_READY__=!0,s()},fail(e){o.push(Me(e)),c(e)}}}var Pe=[`mobile`,`desktop`,`highEnd`];function Fe(e){let t=new URLSearchParams(e),n=t.get(`tier`),r=Number(t.get(`seed`));return{harness:t.get(`harness`)===`1`,tier:Pe.find(e=>e===n)??null,seed:Number.isInteger(r)&&r>0?r:ke}}var Ie=[`KeyW`,`ArrowUp`],Le=[`KeyS`,`ArrowDown`],Re=[`KeyA`,`ArrowLeft`],ze=[`KeyD`,`ArrowRight`],Be=[`Space`],Ve=[`KeyC`,`ControlLeft`],He=[`ShiftLeft`,`ShiftRight`],Ue=new Set([...Ie,...Le,...Re,...ze,...Be,...Ve]);function We(){return{dragX:0,dragY:0,zoom:1,moveX:0,moveZ:0,lift:0,sprint:!1}}function Ge(e){e.dragX=0,e.dragY=0,e.zoom=1}function Ke(e){return Math.min(1,Math.max(-1,e))}function qe(e){return e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement}function Je({canvas:e,stick:t,input:n,onMove:r}){let i=new Set,a={x:0,y:0},o=e=>+!!e.some(e=>i.has(e)),s=()=>{n.moveX=Ke(o(ze)-o(Re)+a.x),n.moveZ=Ke(o(Ie)-o(Le)-a.y),n.lift=o(Be)-o(Ve),n.sprint=o(He)===1},c=b(e,{onDrag(e,t){n.dragX+=e,n.dragY+=t},onPinch(e){n.zoom/=e},onWheel(e){n.zoom*=1+e*.001}}),l=e=>{qe(e.target)||e.metaKey||e.altKey||(He.includes(e.code)&&i.add(e.code),Ue.has(e.code)&&(e.preventDefault(),i.add(e.code),r()),s())},u=e=>{i.delete(e.code),s()},d=()=>{i.clear(),a.x=0,a.y=0,s()},f=e=>{if(!t)return;let n=t.getBoundingClientRect(),r=n.width/2,i=(e.clientX-n.left-r)/r,o=(e.clientY-n.top-r)/r,c=Math.max(1,Math.hypot(i,o));a.x=i/c,a.y=o/c,t.style.setProperty(`--stick-x`,String(a.x)),t.style.setProperty(`--stick-y`,String(a.y)),s()},p=e=>{t?.setPointerCapture(e.pointerId),r(),f(e)},m=e=>{t?.hasPointerCapture(e.pointerId)&&f(e)},h=()=>{a.x=0,a.y=0,t?.style.setProperty(`--stick-x`,`0`),t?.style.setProperty(`--stick-y`,`0`),s()};return window.addEventListener(`keydown`,l),window.addEventListener(`keyup`,u),window.addEventListener(`blur`,d),t?.addEventListener(`pointerdown`,p),t?.addEventListener(`pointermove`,m),t?.addEventListener(`pointerup`,h),t?.addEventListener(`pointercancel`,h),()=>{c(),window.removeEventListener(`keydown`,l),window.removeEventListener(`keyup`,u),window.removeEventListener(`blur`,d),t?.removeEventListener(`pointerdown`,p),t?.removeEventListener(`pointermove`,m),t?.removeEventListener(`pointerup`,h),t?.removeEventListener(`pointercancel`,h)}}var Ye=64,Xe=.3;function Ze(e,t,n,r,i){let a=i*i,o=a*i;return .5*(2*t+(n-e)*i+(2*e-5*t+4*n-r)*a+(3*t-e-3*n+r)*o)}function Qe(e){return Math.sin(Math.PI*e)}function $e(e,t,n,r){let i=e.length,a=e[(t+i-1)%i],o=e[t],s=e[(t+1)%i],c=e[(t+2)%i];for(let e=0;e<3;e+=1)r.position[e]=Ze(a.position[e],o.position[e],s.position[e],c.position[e],n),r.target[e]=Ze(a.target[e],o.target[e],s.target[e],c.target[e],n);return r}function et(e,t,n){let r={position:[0,0,0],target:[0,0,0]},i=0;for(let a=1;a<Ye;a+=1){let o=a/Ye,[s,c,l]=$e(e,t,o,r).position,u=n.clearance*Math.min(1,Qe(o)/Xe);i=Math.max(i,(n.surface(s,l)+u-c)/Qe(o))}return i}function tt(e,{dwell:t=5,travel:n=15,floor:r}={}){if(e.length===0)throw Error(`a tour needs at least one view`);return{poses:e,dwell:t,travel:n,rise:e.map((t,n)=>r?et(e,n,r):0)}}function nt(e){let t=Math.min(1,Math.max(0,e));return t*t*t*(t*(t*6-15)+10)}function rt(e,t,n){let r=e.poses.length,i=e.dwell+e.travel,a=r*i,o=(t%a+a)%a,s=Math.min(r-1,Math.floor(o/i)),c=nt((o-s*i-e.dwell)/e.travel);return $e(e.poses,s,c,n),n.position[1]+=e.rise[s]*Qe(c),n.position[0]+=Math.sin(t*.21)*.6,n.position[1]+=Math.sin(t*.17)*.3,n.position[2]+=Math.cos(t*.19)*.6,n}var it=1.7,at=.0045,ot=4,st=240,ct=9,lt=26,ut=.7,dt=5,ft=1.2,pt={position:[0,0,0],target:[0,0,0]};function q(e,t,n){return Math.min(n,Math.max(t,e))}function mt(e,t){for(let n=0;n<3;n+=1)t.position[n]=e.position[n],t.target[n]=e.target[n]}function ht(e,t,n){return Math.max(e.heightAt(t,n),e.waterLevel)}function gt(){return{mode:`tour`,pose:{position:[0,0,0],target:[0,0,0]},theta:0,phi:0,radius:ot,idle:0,returning:!1,blend:0,from:{position:[0,0,0],target:[0,0,0]},yaw:0,pitch:0}}function _t(e){let{position:t,target:n}=e.pose,r=t[0]-n[0],i=t[1]-n[1],a=t[2]-n[2],o=q(Math.hypot(r,i,a),ot,st);e.radius=o,e.theta=Math.atan2(r,a),e.phi=Math.asin(q(i/o,-1,1)),e.mode=`orbit`,e.returning=!1,e.idle=0}function vt(e,t,n){let{position:r,target:i}=e.pose;e.theta-=t.dragX*at,e.phi=q(e.phi+t.dragY*at,-.2,1.45),e.radius=q(e.radius*t.zoom,ot,st);let a=Math.cos(e.phi)*e.radius,o=i[0]+Math.sin(e.theta)*a,s=i[2]+Math.cos(e.theta)*a;r[0]=o,r[2]=s,r[1]=Math.max(i[1]+Math.sin(e.phi)*e.radius,ht(n,o,s)+ft)}function yt(e){let{position:t,target:n}=e.pose,r=n[0]-t[0],i=n[1]-t[1],a=n[2]-t[2],o=Math.hypot(r,i,a)||1;e.yaw=Math.atan2(r,a),e.pitch=Math.asin(q(i/o,-1,1)),e.mode=`explore`,e.returning=!1}function bt(e,t,n,r){let{position:i,target:a}=e.pose;e.yaw-=t.dragX*at,e.pitch=q(e.pitch-t.dragY*at,-1.35,1.35);let o=t.sprint?lt:ct,s=Math.sin(e.yaw),c=Math.cos(e.yaw),l=i[0]+(s*t.moveZ-c*t.moveX)*o*n,u=i[2]+(c*t.moveZ+s*t.moveX)*o*n,d=r.size*.49,f=Math.hypot(l,u);f>d&&(l*=d/f,u*=d/f);let p=ht(r,l,u)+it,m=i[1]+t.lift*o*ut*n;t.lift<=0&&(m-=dt*n),i[0]=l,i[1]=Math.max(m,p),i[2]=u;let h=Math.cos(e.pitch);a[0]=l+s*h*10,a[1]=i[1]+Math.sin(e.pitch)*10,a[2]=u+c*h*10}function xt(e){mt(e.pose,e.from),e.blend=0,e.returning=!0,e.mode=`tour`}function St(e,t,n,r,i){if(rt(i.tour,n,pt),i.explore)return e.mode!==`explore`&&yt(e),bt(e,t,r,i.ground),e;if(e.mode===`explore`&&xt(e),t.dragX!==0||t.dragY!==0||t.zoom!==1)return e.mode!==`orbit`&&_t(e),vt(e,t,i.ground),e.idle=0,e;if(e.mode===`orbit`){if(e.idle+=r,e.idle<8)return e;xt(e)}if(e.returning){e.blend=Math.min(1,e.blend+r/3);let t=nt(e.blend);for(let n=0;n<3;n+=1)e.pose.position[n]=e.from.position[n]+(pt.position[n]-e.from.position[n])*t,e.pose.target[n]=e.from.target[n]+(pt.target[n]-e.from.target[n])*t;return e.blend>=1&&(e.returning=!1),e}return mt(pt,e.pose),e}function Ct({world:t,canvas:n,stick:r=null,interactive:i,onMove:a}){let{ground:o}=t,s=tt(I.map(e=>le(e,o)),{floor:{surface:(e,t)=>Math.max(o.heightAt(e,t),o.waterLevel),clearance:5}}),c=gt(),l=We(),u={tour:s,ground:o,explore:!1},d=new e.Vector3,f=null,p=null,m=()=>void 0;function h(e){let t=f??c.pose;e.position.set(t.position[0],t.position[1],t.position[2]),e.lookAt(d.set(t.target[0],t.target[1],t.target[2]))}return{module:{name:`rig`,build(e){p=e.camera,i&&(m=Je({canvas:n,stick:r,input:l,onMove:a})),St(c,l,0,0,u),h(e.camera)},update(e,t,n){u.explore=e.explore,St(c,l,t.frame*K,K,u),Ge(l),h(n.camera)},dispose(){m(),p=null}},pin(e){if(e===null){f=null;return}let t=ue(e);if(!t)throw Error(`no view named "${e}" · known: ${I.map(e=>e.name).join(`, `)}`);f=le(t,o)},place:h,pose(){let{x:t,y:n,z:r}=p?.position??d.set(0,0,0),{x:i,y:a,z:o,w:s}=p?.quaternion??new e.Quaternion;return{position:[t,n,r],quaternion:[i,a,o,s],mode:f?`tour`:c.mode}}}}var wt=2,Tt=`scenery:context-reloads`;function Et(e){document.documentElement.dataset.sceneryState=e}function Dt(){try{return Number(window.sessionStorage.getItem(Tt)??0)}catch{return wt}}function Ot(e){try{window.sessionStorage.setItem(Tt,String(e))}catch{}}function kt(e){e.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),Et(`lost`)}),e.addEventListener(`webglcontextrestored`,()=>{let e=Dt();e>=wt||(Ot(e+1),window.location.reload())})}function At(e){let t=document.documentElement,n=document.querySelector(`nav button`),r=e=>{t.dataset.sceneryMode=e.explore?`explore`:`tour`,n&&(n.setAttribute(`aria-pressed`,String(e.explore)),n.textContent=e.explore?`Back to the tour`:`Explore`)};n?.addEventListener(`click`,()=>e.setState({explore:!e.getState().explore})),window.addEventListener(`keydown`,t=>{t.code===`Escape`&&e.getState().explore&&e.setState({explore:!1})}),e.store.subscribe(r),r(e.getState())}function jt(e){let t=document.querySelector(`output`);t&&(t.textContent=e)}function Mt(e){e.instanceMatrix.needsUpdate=!0,e.instanceColor&&(e.instanceColor.needsUpdate=!0),e.computeBoundingSphere()}function Nt(t){t&&(t.geometry.dispose(),t.material instanceof e.Material&&t.material.dispose(),t.removeFromParent(),t.dispose())}var J={zenith:`#2f5f9f`,horizon:`#d3e0ea`,sun:`#fff1d6`,skyFill:`#a9c4e8`,groundFill:`#6b6452`,sand:`#cdbf9a`,grass:`#6f8f4e`,grassDry:`#8f9a5a`,rock:`#7d7a74`,cairn:`#a8a193`,waterDeep:`#1d4d68`,waterShallow:`#8fc2cc`,foam:`#eef2f5`};function Pt(t){let n=new e.IcosahedronGeometry(1,1),r=F(t),i=n.getAttribute(`position`);for(let e=0;e<i.count;e+=1){let t=i.getX(e),n=i.getY(e),a=i.getZ(e),o=1+r.sample(t*1.3,n*1.3,a*1.3)*.3;i.setXYZ(e,t*o,n*o*.72,a*o)}return n.computeVertexNormals(),n.computeBoundingBox(),n.computeBoundingSphere(),n}var Ft=9,It=6,Lt=2.9,Rt=1,zt=2,Y=new e.Object3D,Bt=new e.Color;function Vt(e){let t=e.size/2,n={x:0,z:0,height:-1/0};for(let r=-t;r<=t;r+=zt)for(let i=-t;i<=t;i+=zt){let t=e.heightAt(r,i);t>n.height&&Object.assign(n,{x:r,z:i,height:t})}return n}function Ht(t){let n=null;return{name:`cairn`,build({scene:r,rng:i}){let{ground:a}=t,o=i.fork(`cairn:lay`),s=Vt(a),c=Pt(i.fork(`cairn:shape`).int(1,1e6)),l=new e.MeshStandardMaterial({name:`cairn`,flatShading:!0,roughness:1,metalness:0});Ee(l,t),n=new e.InstancedMesh(c,l,16),n.name=`cairn`,n.castShadow=!0,n.receiveShadow=!0;let u=0,d=e=>{Y.updateMatrix(),n.setMatrixAt(u,Y.matrix),n.setColorAt(u,Bt.set(J.cairn).offsetHSL(0,0,e)),u+=1},f=a.heightAt(s.x,s.z)-.5;for(let t=0;t<Ft;t+=1){let n=e.MathUtils.lerp(Lt,Rt,t/8),r=n*o.range(.4,.52),i=n*.12;Y.position.set(s.x+o.range(-i,i),f+r*.6,s.z+o.range(-i,i)),Y.rotation.set(o.range(-.06,.06),o.range(0,Math.PI*2),o.range(-.06,.06)),Y.scale.set(n,r,n*o.range(.85,1.05)),d(o.range(-.05,.05)),f+=r*1.05}Y.position.set(s.x,f+1.1,s.z),Y.rotation.set(.05,o.range(0,Math.PI*2),-.04),Y.scale.set(.7,2.4,.52),d(.04);for(let e=0;e<It;e+=1){let t=(e+o.range(-.3,.3))/It*Math.PI*2,n=Lt*o.range(1.25,1.9),r=s.x+Math.cos(t)*n,i=s.z+Math.sin(t)*n,c=o.range(.35,.75);Y.position.set(r,a.heightAt(r,i)+c*.1,i),Y.rotation.set(o.range(-.3,.3),o.range(0,Math.PI*2),o.range(-.3,.3)),Y.scale.set(c,c*.6,c*o.range(.8,1.2)),d(o.range(-.08,.02))}Mt(n),r.add(n)},dispose(){Nt(n),n=null}}}var Ut=.35,Wt=170,Gt=40;function Kt(e,t,n,r){let i=Math.abs(e-n),a=Math.abs(t-r);return Math.hypot(Math.min(i,z-i),Math.min(a,z-a))}function qt(e,t){let n=e.int(4,6),r=e.range(50,150),i=r*e.range(.2,.28),a=e.range(-.3,.3),o=t[0]*Math.cos(a)-t[1]*Math.sin(a),s=t[0]*Math.sin(a)+t[1]*Math.cos(a);return Array.from({length:n},(t,a)=>{let c=a/(n-1)-.5+e.range(-.06,.06),l=i*(.55+.45*Math.cos(c*Math.PI))*e.range(.85,1.15),u=l*e.range(.56,.8),d=l*e.range(-.35,.35);return{offset:[o*c*r-s*d,u*Ut,s*c*r+o*d],scale:[l,u,l*e.range(.86,1)],turn:e.range(0,Math.PI*2)}})}function Jt({rng:e,count:t,along:n}){let r=e.fork(`place`),i=e.fork(`shape`),a=z/2,o=[];for(let e=0;o.length<t&&e<t*Gt;e+=1){let e=r.range(-a,a),t=r.range(-a,a);o.every(n=>Kt(n.x,n.z,e,t)>Wt)&&o.push({x:e,y:120+i.range(-12,14),z:t,puffs:qt(i,n)})}return o}var Yt=[760,980],Xt=.0016,Zt=`
  ${V}

  attribute vec3 aCloud;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main () {
    // The cloud rides the wind, and comes round again on the far side of the
    // weather's square.
    vec2 home = mod(aCloud.xz + uWindDrift + WEATHER_SPAN * 0.5, WEATHER_SPAN) - WEATHER_SPAN * 0.5;

    // It is small when it does: grown from nothing out in the haze, and back
    // to nothing before it reaches the seam, so no cloud ever blinks.
    float presence = 1.0 - smoothstep(${Yt[0].toFixed(1)}, ${Yt[1].toFixed(1)}, length(home));

    // The instance matrix holds the puff's place in its cloud, not in the world.
    mat3 puff  = mat3(instanceMatrix);
    vec3 local = (instanceMatrix * vec4(position, 1.0)).xyz * presence;

    vWorld  = vec3(home.x, aCloud.y, home.y) + local;
    vNormal = puff * (normal / vec3(dot(puff[0], puff[0]), dot(puff[1], puff[1]), dot(puff[2], puff[2])));

    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`,Qt=`
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform vec3 uSunDirection;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main () {
    vec3 normal = normalize(vNormal);

    // Two colours and the facets do the rest: cream where a face is turned to
    // the sun, the sky's own blue where it is turned away, and the flat
    // underside a little deeper still.
    float toward = smoothstep(-0.35, 0.55, dot(normal, uSunDirection));
    float under  = smoothstep(0.5, 0.95, -normal.y);
    vec3  colour = mix(uShade, uLit, toward) * (1.0 - 0.1 * under);

    // Haze by hand, and no tone mapping, for the reason the sky has none: a
    // far cloud has to arrive at the horizon in the horizon's exact colour.
    float far  = distance(cameraPosition, vWorld) * ${Xt};
    float haze = 1.0 - exp(-far * far);

    gl_FragColor = vec4(mix(colour, uHaze, haze), 1.0);

    #include <colorspace_fragment>
  }
`;function $t({lit:t,shade:n,haze:r,sunDirection:i,wind:a}){return new e.ShaderMaterial({name:`cloud`,vertexShader:Zt,fragmentShader:Qt,fog:!1,uniforms:{...a,uLit:{value:new e.Color(t)},uShade:{value:new e.Color(n)},uHaze:{value:new e.Color(r)},uSunDirection:{value:i.clone()}}})}var en=60,tn={mobile:256,desktop:512,highEnd:512},X=new e.Object3D;function nn(t){let n=new e.IcosahedronGeometry(1,1),r=F(t),i=n.getAttribute(`position`);for(let e=0;e<i.count;e+=1){let t=i.getX(e),n=i.getY(e),a=i.getZ(e),o=1+r.sample(t*1.1,n*1.1,a*1.1)*.14;i.setXYZ(e,t*o,Math.max(n*o,-Ut),a*o)}return n.computeVertexNormals(),n}function rn(t){let n=null,r=null;return{name:`clouds`,build({scene:i,rng:a}){let o=Jt({rng:a.fork(`clouds:layout`),count:en,along:t.wind.direction}),s=o.reduce((e,t)=>e+t.puffs.length,0),c=nn(a.fork(`clouds:puff`).int(1,1e6)),l=new Float32Array(s*3),u=$t({lit:J.sun,shade:new e.Color(J.skyFill).lerp(new e.Color(J.horizon),.3),haze:J.horizon,sunDirection:R,wind:t.wind.uniforms});n=new e.InstancedMesh(c,u,s),n.name=`clouds`,n.frustumCulled=!1;let d=[],f=0;for(let e of o)for(let t of e.puffs)X.position.set(...t.offset),X.rotation.set(0,t.turn,0),X.scale.set(...t.scale),X.updateMatrix(),n.setMatrixAt(f,X.matrix),l.set([e.x,e.y,e.z],f*3),f+=1,d.push({x:e.x+t.offset[0],y:e.y+t.offset[1],z:e.z+t.offset[2],radius:(t.scale[0]+t.scale[2])/2});c.setAttribute(`aCloud`,new e.InstancedBufferAttribute(l,3)),n.instanceMatrix.needsUpdate=!0,r=Te(d,tn[t.quality.tier]),t.clouds.uniforms.uCloudShadow.value=r,i.add(n)},dispose(){Nt(n),r?.dispose(),t.clouds.uniforms.uCloudShadow.value=null,n=null,r=null}}}var an=`
  varying vec3 vDirection;

  void main () {
    vDirection = normalize(position);

    // Turned with the view and never moved by it: the dome is drawn around the
    // camera wherever that is, so walking never brings its wall closer and a
    // picture from a new place needs nothing told to the sky first.
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  }
`,on=`
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDirection;

  varying vec3 vDirection;

  void main () {
    vec3 direction = normalize(vDirection);

    // Below the horizon the dome keeps the horizon colour, so the fog over the
    // water blends into it instead of meeting a darker band.
    float height = clamp(direction.y, 0.0, 1.0);
    vec3  colour = mix(uHorizon, uZenith, pow(height, 0.55));

    float toward = max(dot(direction, uSunDirection), 0.0);

    colour += uSun * (pow(toward, 420.0) * 1.6 + pow(toward, 10.0) * 0.16);

    gl_FragColor = vec4(colour, 1.0);

    // No tone mapping on purpose. Fog is mixed in after tone mapping, in the
    // exact colour it was given, so the dome has to arrive at the horizon in
    // that same colour or the land fades into a band that is not the sky.
    #include <colorspace_fragment>
  }
`;function sn({zenith:t,horizon:n,sun:r,sunDirection:i}){return new e.ShaderMaterial({name:`sky`,vertexShader:an,fragmentShader:on,side:e.BackSide,depthWrite:!1,fog:!1,uniforms:{uZenith:{value:new e.Color(t)},uHorizon:{value:new e.Color(n)},uSun:{value:new e.Color(r)},uSunDirection:{value:i.clone()}}})}var cn=260,ln=1200;function un(t){let n=null,r=null,i=null;return{name:`environment`,build({scene:a,renderer:o}){o.shadowMap.enabled=t.quality.shadowsEnabled,o.shadowMap.type=e.PCFShadowMap,a.fog=new e.FogExp2(J.horizon,.0028),t.wind.blow(0);let s=t.ground.size*.62;r=D({color:J.sun,intensity:3.2,position:R.clone().multiplyScalar(cn),shadowMapSize:t.quality.shadowMapSize,shadowFrustum:s,shadowFar:cn*2}),r.castShadow=t.quality.shadowsEnabled,r.shadow.bias=-5e-4,r.shadow.normalBias=.16,i=O({skyColor:J.skyFill,groundColor:J.groundFill,intensity:1.7}),n=new e.Mesh(new e.SphereGeometry(ln,24,12),sn({zenith:J.zenith,horizon:J.horizon,sun:J.sun,sunDirection:R})),n.name=`sky`,n.frustumCulled=!1,n.renderOrder=-1,a.add(r,r.target,i,n)},update(e,n){t.wind.blow(n.frame*K)},dispose(){n?.geometry.dispose(),n?.material instanceof e.Material&&n.material.dispose(),r?.shadow.map?.dispose(),r?.removeFromParent(),r?.target.removeFromParent(),i?.removeFromParent(),n?.removeFromParent(),n=null,r=null,i=null}}}var dn=30;function fn({ground:e,rng:t,count:n,reach:r=.9,accept:i}){let a=e.size/2*r,o=[];for(let r=0;o.length<n&&r<n*dn;r+=1){let n=Math.sqrt(t.next())*a,r=t.range(0,Math.PI*2),s=Math.cos(r)*n,c=Math.sin(r)*n,l={x:s,z:c,height:e.heightAt(s,c),slope:e.slopeAt(s,c)};i(l)&&o.push(l)}return o}var pn={mobile:60,desktop:140,highEnd:220},Z=new e.Object3D,mn=new e.Color;function hn(t){let n=null;return{name:`rocks`,build({scene:r,rng:i}){let{ground:a}=t,o=i.fork(`rocks:place`),s=i.fork(`rocks:shape`),c=fn({ground:a,rng:o,count:pn[t.quality.tier],accept:e=>e.height>a.waterLevel-.4&&e.slope<.5}),l=Pt(s.int(1,1e6)),u=new e.MeshStandardMaterial({name:`rock`,flatShading:!0,roughness:1,metalness:0});Ee(u,t),n=new e.InstancedMesh(l,u,c.length),n.name=`rocks`,n.castShadow=!0,n.receiveShadow=!0,c.forEach((e,t)=>{let r=o.range(.5,2.6);Z.position.set(e.x,e.height-r*.18,e.z),Z.rotation.set(o.range(-.3,.3),o.range(0,Math.PI*2),o.range(-.3,.3)),Z.scale.set(r,r*o.range(.7,1.1),r*o.range(.8,1.2)),Z.updateMatrix(),n.setMatrixAt(t,Z.matrix),n.setColorAt(t,mn.set(J.rock).offsetHSL(0,0,o.range(-.07,.07)))}),Mt(n),r.add(n)},dispose(){Nt(n),n=null}}}var gn={mobile:96,desktop:160,highEnd:224},_n=new e.Color(J.sand),vn=new e.Color(J.grass),yn=new e.Color(J.grassDry),bn=new e.Color(J.rock),xn=new e.Color;function Sn(e,t,n,r,i){let{ground:a}=e,o=r-a.waterLevel,s=a.slopeAt(t,n);return i.copy(_n),i.lerp(vn,j(.7,2.4,o)),i.lerp(yn,j(.35,.6,o/a.relief)),i.lerp(bn,j(.16,.34,s)),i}function Cn(e,t){let n=e.getAttribute(`position`),r=e.getIndex(),i=[];for(let e=0;r&&e<r.count;e+=6){let a=Array.from({length:6},(t,n)=>r.getX(e+n));a.some(e=>n.getY(e)>t)&&i.push(...a)}return i}function wn(t){let n=null;return{name:`terrain`,build({scene:r}){let{ground:i}=t,a=gn[t.quality.tier],o=new e.PlaneGeometry(i.size,i.size,a,a);o.rotateX(-Math.PI/2);let s=o.getAttribute(`position`),c=new Float32Array(s.count*3);for(let e=0;e<s.count;e+=1){let n=s.getX(e),r=s.getZ(e),a=i.heightAt(n,r);s.setY(e,a),Sn(t,n,r,a,xn).toArray(c,e*3)}o.setAttribute(`color`,new e.BufferAttribute(c,3)),o.setIndex(Cn(o,i.waterLevel-5)),o.computeVertexNormals(),o.computeBoundingBox(),o.computeBoundingSphere();let l=new e.MeshStandardMaterial({name:`terrain`,vertexColors:!0,flatShading:!0,roughness:.96,metalness:0});Ee(l,t),n=new e.Mesh(o,l),n.name=`terrain`,n.castShadow=!0,n.receiveShadow=!0,r.add(n)},dispose(){n?.geometry.dispose(),n?.material instanceof e.Material&&n.material.dispose(),n?.removeFromParent(),n=null}}}var Tn={mobile:900,desktop:2600,highEnd:4200},Q=.8,En=`
  #ifdef USE_INSTANCING
    mat3 tuft = mat3(instanceMatrix);
    vec2 root = instanceMatrix[3].xz;
    vec3 lee  = (vec3(WIND.x, 0.0, WIND.y) * tuft) / vec3(dot(tuft[0], tuft[0]), dot(tuft[1], tuft[1]), dot(tuft[2], tuft[2]));

    float gust   = windGust(root);
    float shiver = sin(dot(windFrame(root), vec2(149.0, -113.0)));
    float lean   = 0.16 + 0.5 * gust + 0.08 * shiver * (0.4 + 0.6 * gust);
    float up     = clamp(transformed.y / ${Q}, 0.0, 1.0);

    transformed   += lee * (lean * up * up * ${Q} * length(tuft[1]));
    transformed.y -= lean * lean * up * up * ${Q*.35};
  #endif
`,$=new e.Object3D,Dn=new e.Color;function On(){let t=[-.45,0,.45].map((t,n)=>{let r=new e.ConeGeometry(.09,Q,3,1,!0);return r.translate(0,Q/2,0),r.rotateZ(t),r.rotateY(n*2.1),r}),n=ne(t);for(let e of t)e.dispose();let r=n.getAttribute(`normal`);for(let e=0;e<r.count;e+=1)r.setXYZ(e,0,1,0);return n.computeBoundingBox(),n.computeBoundingSphere(),n}function kn(e,t){de(e,`tuft-sway`,e=>{Object.assign(e.uniforms,t.uniforms),e.vertexShader=L(L(e.vertexShader,`#include <common>`,V),`#include <begin_vertex>`,En)})}function An(t){let n=null;return{name:`tufts`,build({scene:r,rng:i}){let{ground:a}=t,o=i.fork(`tufts:place`),s=F(i.fork(`tufts:patches`).int(1,1e6)),c=fn({ground:a,rng:o,count:Tn[t.quality.tier],accept(e){let t=e.height-a.waterLevel;return t>1.1&&t<a.relief*.5&&e.slope<.2&&s.fbm(e.x*.03,9.1,e.z*.03,2)>-.08}}),l=On(),u=new e.MeshStandardMaterial({name:`tuft`,roughness:1,metalness:0,side:e.DoubleSide});kn(u,t.wind),Ee(u,t),n=new e.InstancedMesh(l,u,c.length),n.name=`tufts`,n.receiveShadow=!0,c.forEach((e,t)=>{let r=o.range(.7,1.7);$.position.set(e.x,e.height-.05,e.z),$.rotation.set(0,o.range(0,Math.PI*2),0),$.scale.set(r,r*o.range(.8,1.4),r),$.updateMatrix(),n.setMatrixAt(t,$.matrix),n.setColorAt(t,Dn.set(o.next()<.3?J.grassDry:J.grass).offsetHSL(0,0,o.range(-.05,.08)))}),Mt(n),r.add(n)},dispose(){Nt(n),n=null}}}function jn(t,n){let r=n+1,i=t.size/n,a=t.size/2,o=new Uint16Array(r*r);for(let n=0;n<r;n+=1)for(let s=0;s<r;s+=1){let c=t.heightAt(s*i-a,n*i-a);o[n*r+s]=e.DataUtils.toHalfFloat(c-t.waterLevel)}let s=new e.DataTexture(o,r,r,e.RedFormat,e.HalfFloatType);return s.name=`height-map`,s.magFilter=e.LinearFilter,s.minFilter=e.LinearFilter,s.needsUpdate=!0,{texture:s,scale:n/(r*t.size)}}var Mn=3200,Nn=`
  ${V}
  ${W}

  varying vec3 vWorld;
  varying vec2 vCloudUv;

  #include <fog_pars_vertex>

  void main () {
    vec4 world      = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * world;

    vWorld      = world.xyz;
    vCloudUv    = cloudShadowUv(world.xyz);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`,Pn=`
  ${V}
  ${W}

  uniform float     uTime;
  uniform vec3      uDeep;
  uniform vec3      uShallow;
  uniform vec3      uSky;
  uniform vec3      uFoam;
  uniform vec3      uSun;
  uniform vec3      uSunDirection;
  uniform sampler2D uGround;
  uniform float     uGroundScale;

  varying vec3 vWorld;
  varying vec2 vCloudUv;

  // Depth of water, in world units, over which the sea thins out to nothing
  // on the sand.
  const float SHALLOWS = 0.9;

  // Depth down to which the sea keeps all of its pale colour, and the depth
  // from which it is its darkest and hides whatever is under it.
  const float PALE = 0.3;
  const float DEEP = ${5 .toFixed(1)};

  // How much of what is under the shallows shows when looking straight down.
  const float CLEAR = 0.18;

  // How much of the sky the surface gives back when it is seen edge-on.
  const float SHEEN = 0.25;

  // Depth the foam on the waterline reaches out to when the swell is level.
  const float RIM = 0.18;

  // The wavelet behind the rim: its lines per unit of depth, how fast they run
  // in (one every five seconds or so, and one on its way at the tenth second,
  // when the postcards are taken), and the depth they first show at.
  const float WAVELET_DENSITY = 4.4;
  const float WAVELET_SPEED   = 1.17;
  const float WAVELET_START   = 1.3;

  // How far upwind to feel for the bottom, to tell a shore the wind blows onto
  // from one it blows off, and the drop in depth over that reach that makes a
  // shore fully one or the other.
  const float FETCH  = 3.0;
  const float SHELVE = 0.35;

  // How much darker a gust ruffles the water, and how much of its light the
  // sea loses under a cloud.
  const float RUFFLE = 0.13;
  const float GLOOM  = 0.5;

  #include <fog_pars_fragment>

  void main () {
    vec2 at = vWorld.xz;

    // Four travelling sines stand in for a normal map: cheap, endless, and a
    // pure function of position and time. All four run before the wind, two
    // straight down it and two off to either side, so the sea has a grain and
    // the grain has a direction.
    vec2  run   = vec2(dot(at, WIND), dot(at, vec2(-WIND.y, WIND.x)));
    float along = sin(run.x * 0.35 - uTime * 0.9) + sin((run.x * 0.98 + run.y * 0.21) * 0.43 - uTime * 1.1);
    float aside = sin((run.x * 0.82 + run.y * 0.57) * 0.27 - uTime * 0.7) - sin((run.x * 0.87 - run.y * 0.5) * 0.21 - uTime * 0.5);

    // The gusts the grass bends to cross the water too, as patches where it
    // is ruffled. A patch narrower than a pixel is only shimmer, so far off
    // they even out to the average.
    float gust = windGust(at);

    gust = mix(gust, 0.5, smoothstep(0.08, 0.4, fwidth(gust)));

    // Far away a ripple is smaller than a pixel and turns into a moire of the
    // sampling grid, so the waves flatten out with distance.
    float calm = (0.03 + 0.04 * gust) / (1.0 + distance(cameraPosition, vWorld) * 0.012);

    vec3 normal = normalize(vec3((WIND.x * along - WIND.y * aside) * calm, 1.0, (WIND.y * along + WIND.x * aside) * calm));
    vec3 view   = normalize(cameraPosition - vWorld);

    // How much water lies over the land here. The map is on the terrain's own
    // grid, so zero is where the mesh breaks the surface.
    float depth = -texture2D(uGround, at * uGroundScale + 0.5).r;
    float pixel = fwidth(depth);

    // The sea's own colour is how much of it there is to look through: pale
    // over the shelf, where the sand is close under it, and dark past the
    // drop. On top of that the surface gives back some sky, most at a glance.
    float murk    = smoothstep(PALE, DEEP, depth);
    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    vec3  body    = mix(uShallow, uDeep, murk);
    vec3  colour  = mix(mix(body, uDeep, RUFFLE * gust), uSky, fresnel * SHEEN);

    // Under a cloud the sea is duller and the sun has nothing to glint off.
    float light   = cloudLight(vCloudUv);
    vec3  halfway = normalize(uSunDirection + view);

    colour *= mix(1.0 - GLOOM, 1.0, light);
    colour += uSun * pow(max(dot(normal, halfway), 0.0), 220.0) * 0.9 * light * light;

    // The sea has no edge of its own: it thins over the last of the sand until
    // the sand is all there is. Over a couple of pixels at least, so the edge
    // stays soft from across the bay. The other way it closes early, at half
    // its darkness: a slanting look through the shallows runs on under the
    // deep water, where the terrain has built no floor to find.
    float veil  = max(fresnel, min(murk * 2.0, 1.0));
    float alpha = mix(1.0 - CLEAR, 1.0, veil) * smoothstep(0.0, SHALLOWS + pixel * 2.0, depth);

    // Which shore this is. Where the bottom is deeper upwind, the wind is
    // bringing the sea in; where it is shallower, the land is in the way and
    // the water lies in its lee. Looked up only near the land.
    float upwind   = depth < WAVELET_START * 2.0 ? -textureLod(uGround, (at - WIND * FETCH) * uGroundScale + 0.5, 0.0).r : depth;
    float windward = clamp(0.5 + (upwind - depth) / SHELVE * 0.5, 0.0, 1.0);

    // Foam where it runs out, reaching further and whiter where the swell is
    // up or a gust is behind it, further still on the windward shore, and all
    // but gone in the lee. Never thinner than a pixel or so, so from a distance
    // the island still has a drawn shoreline all the way round.
    float swell = (along + aside) * 0.25 + (gust - 0.5) * 0.5;
    float reach = RIM * (1.0 + 0.6 * swell) * mix(0.6, 1.5, windward) + pixel * 1.5;
    float foam  = (1.0 - smoothstep(reach * 0.5, reach, depth)) * clamp(0.65 + 0.5 * swell, 0.0, 1.0);

    // One wavelet behind it: a fainter line that drifts in and dies on the rim.
    // Where a pixel spans more than the gap between two lines there is nothing
    // to draw but moire, so it fades out with distance.
    float crest   = smoothstep(0.8, 1.0, sin(depth * WAVELET_DENSITY + uTime * WAVELET_SPEED + swell));
    float wavelet = crest * (1.0 - smoothstep(RIM, WAVELET_START, depth)) * (1.0 - smoothstep(0.4, 1.6, pixel * WAVELET_DENSITY));

    foam = max(foam, wavelet * mix(0.25, 0.75, windward));

    gl_FragColor = vec4(mix(colour, uFoam, foam), mix(alpha, 1.0, foam));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;function Fn(t){let n=null,r=null,i=null;return{name:`water`,build({scene:a}){let o=jn(t.ground,gn[t.quality.tier]);i=o.texture,r=new e.ShaderMaterial({name:`water`,vertexShader:Nn,fragmentShader:Pn,transparent:!0,fog:!0,uniforms:{...e.UniformsUtils.clone(e.UniformsLib.fog),...t.wind.uniforms,...t.clouds.uniforms,uTime:{value:0},uDeep:{value:new e.Color(J.waterDeep)},uShallow:{value:new e.Color(J.waterShallow)},uSky:{value:new e.Color(J.skyFill)},uFoam:{value:new e.Color(J.foam)},uSun:{value:new e.Color(J.sun)},uSunDirection:{value:R.clone()},uGround:{value:i},uGroundScale:{value:o.scale}}});let s=new e.PlaneGeometry(Mn,Mn);s.rotateX(-Math.PI/2),n=new e.Mesh(s,r),n.name=`water`,n.position.y=t.ground.waterLevel,a.add(n)},update(e,t){r&&(r.uniforms.uTime.value=t.frame*K)},dispose(){n?.geometry.dispose(),r?.dispose(),i?.dispose(),n?.removeFromParent(),n=null,r=null,i=null}}}function In(e){return[un(e),rn(e),wn(e),Fn(e),hn(e),An(e),Ht(e)]}var Ln={harness:null};function Rn(){let e=document.querySelector(`canvas`);if(!e)throw Error(`index.html has no canvas`);let t=Fe(window.location.search),n=se(t.tier??(t.harness?`desktop`:oe())),r=Ae({seed:t.seed,quality:n}),i=Ct({world:r,canvas:e,stick:document.querySelector(`scenery-stick`),interactive:!t.harness,onMove(){o.getState().explore||o.setState({explore:!0})}}),a={hold:!1,frame:0,paint:()=>o.ctx.renderer.render(o.ctx.scene,o.ctx.camera)},o=P({canvas:e,state:{explore:!1},seed:t.seed,clock:C({mode:`fixed`,step:K}),renderer:{shadows:!1,pixelRatioMax:t.harness?1:n.pixelRatio},camera:{fov:55,near:.5,far:3e3},background:J.horizon,lighting:!1,orbit:!1,modules:[...In(r),i.module],onFrame(e,t){a.frame=t.frame},render(){a.hold||a.paint()}});Ln.harness=Ne({app:o,rig:i,painter:a,canvas:e,capturing:t.harness}),kt(e),At(o),o.tick(K),t.harness||o.start(),Et(`ready`),Ln.harness.ready()}try{Rn()}catch(e){Et(`failed`),jt(`This world could not start on this device.`),Ln.harness?.fail(e),console.error(e)}