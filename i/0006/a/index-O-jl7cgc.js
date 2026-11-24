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
`}function g(e){let t=e.toString();if(t.includes(`[native code]`))throw Error(`registerWorkerUpdate: handler is a native or bound function and cannot be serialized — pass a plain, self-contained function expression`);if(!/^\s*(?:async\s+)?(?:function\b|\()/.test(t)&&!/^\s*(?:async\s+)?[\w$]+\s*=>/.test(t))throw Error(`registerWorkerUpdate: handler must be a function expression or arrow function (object method shorthand does not serialize) — it is rehydrated inside a worker and must be self-contained`);return t}var _=!1;function v(e,t={},n={}){let r=g(e),i=t.onError??(e=>{console.error(`registerWorkerUpdate:`,e)}),a=!1,o=null,s=!1,c=null,l=``,u=!1,d=()=>{!u&&l&&(u=!0,URL.revokeObjectURL(l))};if(!n.forceFallback&&typeof Worker<`u`&&typeof URL<`u`&&typeof URL.createObjectURL==`function`)try{l=URL.createObjectURL(new Blob([h(r)],{type:`text/javascript`})),c=new Worker(l,{type:`module`}),c.postMessage({type:`init`,state:t.initialState}),c.onmessage=e=>{d();let n=e.data;a=!1,n?.type===`result`?t.onResult?.(n.state):n?.type===`error`&&i(Error(`worker update handler threw: ${n.message}${n.stack?`\n${n.stack}`:``}`)),v()},c.onerror=e=>{d(),a=!1,i(Error(`worker update failed: ${e.message||`unknown worker error`}`))},c.onmessageerror=()=>{a=!1,i(Error(`worker update: message could not be deserialized`))}}catch(e){d(),c=null,_||(_=!0,console.warn(`registerWorkerUpdate: Worker construction failed, falling back to same-thread microtasks`,e))}let f=t.initialState;function p(n){queueMicrotask(()=>{if(!s){try{let r=e(n,f);r!==void 0&&(f=r),a=!1,t.onResult?.(f)}catch(e){a=!1,i(e instanceof Error?e:Error(String(e)))}v()}})}function m(e){if(a=!0,c)try{c.postMessage({type:`tick`,ctx:e})}catch(e){a=!1,i(e instanceof Error?e:Error(String(e)))}else p(e)}function v(){if(s||a||!o)return;let e=o;o=null,m(e)}return{tick(e){s||(a?o={delta:(o?.delta??0)+e.delta,elapsed:e.elapsed,frame:e.frame}:m({delta:e.delta,elapsed:e.elapsed,frame:e.frame}))},terminate(){s||(s=!0,o=null,a=!1,d(),c?.terminate(),c=null)}}}function y({clock:e,fps:t}={}){let n=new Set,r=new Set,i=0,a=0,o=!1;t!==void 0&&m.setFixedFrameRate(t);function s(){let t=m.deltaTime;if(e)for(let r of e.advance(t)){i+=1;let t=e.elapsed();for(let e of n)e({delta:r,elapsed:t,frame:i})}else{i+=1,a+=t;for(let e of n)e({delta:t,elapsed:a,frame:i})}}function c(){o||(o=!0,m.registerSyncCallback(s),m.resume())}function l(){o&&(o=!1,m.unregisterSyncCallback(s))}function u(e){return n.add(e),o||c(),()=>{n.delete(e)}}function d(e){return u(e)}function f(e){n.delete(e)}function p(e,t){let n=v(e,t);r.add(n);let i=u(e=>n.tick(e));return{unregister:i,terminate(){i(),n.terminate(),r.delete(n)}}}function h(){l(),n.clear();for(let e of r)e.terminate();r.clear(),i=0,a=0}return{onFrame:u,registerUpdate:d,unregisterUpdate:f,registerWorkerUpdate:p,start:c,stop:l,dispose:h}}function b(e,t,{tapThresholdMs:n=250,tapMovePx:r=8}={}){let i=new Map,a=0,o=0,s=0,c=0;e.style.touchAction=`none`;let l=t=>{if(e.setPointerCapture(t.pointerId),i.set(t.pointerId,{x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY}),i.size===1)o=performance.now(),s=t.clientX,c=t.clientY;else if(i.size===2){let[e,t]=[...i.values()];e&&t&&(a=Math.hypot(e.x-t.x,e.y-t.y))}},u=e=>{let n=i.get(e.pointerId);if(n){if(n.lastX=n.x,n.lastY=n.y,n.x=e.clientX,n.y=e.clientY,i.size===1&&t.onDrag)t.onDrag(n.x-n.lastX,n.y-n.lastY,e);else if(i.size===2&&t.onPinch){let[e,n]=[...i.values()];if(!e||!n)return;let r=Math.hypot(e.x-n.x,e.y-n.y),o=(e.x+n.x)/2,s=(e.y+n.y)/2;a>0&&t.onPinch(r/a,o,s),a=r}}},d=e=>{let l=i.get(e.pointerId);if(i.delete(e.pointerId),i.size<2&&(a=0),l&&i.size===0&&t.onTap){let i=performance.now()-o,a=Math.hypot(l.x-s,l.y-c);i<n&&a<r&&t.onTap(l.x,l.y,e)}},f=e=>{t.onWheel&&(e.preventDefault(),t.onWheel(e.deltaY,e))};return e.addEventListener(`pointerdown`,l),e.addEventListener(`pointermove`,u),e.addEventListener(`pointerup`,d),e.addEventListener(`pointercancel`,d),e.addEventListener(`wheel`,f,{passive:!1}),()=>{e.removeEventListener(`pointerdown`,l),e.removeEventListener(`pointermove`,u),e.removeEventListener(`pointerup`,d),e.removeEventListener(`pointercancel`,d),e.removeEventListener(`wheel`,f)}}function x(e){return!!(e&&typeof e==`object`&&`minFilter`in e&&typeof e.dispose==`function`)}function ee(e){for(let t in e){let n=e[t];x(n)&&n.dispose()}let t=e;if(t.uniforms)for(let e in t.uniforms){let n=t.uniforms[e]?.value;x(n)&&n.dispose()}e.dispose()}function te(e){e.traverse(e=>{let t=e;if(t.geometry&&t.geometry.dispose(),t.material){let e=Array.isArray(t.material)?t.material:[t.material];for(let t of e)ee(t)}})}function S({mode:e=`wall`,step:t=1/60,maxSubSteps:n=5}={}){let r=0,i=0,a=[];function o(o){if(a.length=0,e===`wall`)return i+=o,a.push(o),a;for(r+=o;r>=t&&a.length<n;)r-=t,i+=t,a.push(t);return a.length>=n&&(r=0),a}return{mode:e,advance:o,elapsed:()=>i,reset(){r=0,i=0}}}function ne(e,t){let n=e,r=new Set;function i(e){if(e===n)return;let t=n;n=e;for(let e of r)e(n,t)}return{get:()=>n,set(e){i({...n,...e})},dispatch(e){if(!t)throw Error(`createStore.dispatch: store has no reducer`);i(t(n,e))},subscribe(e){return r.add(e),()=>{r.delete(e)}}}}var C=class extends d{constructor(){super(),this.name=`RoomEnvironment`,this.position.y=-3.5;let e=new n;e.deleteAttribute(`uv`);let r=new c({side:t}),i=new c,s=new u(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let d=new o(e,r);d.position.set(-.757,13.219,.717),d.scale.set(31.713,28.305,28.591),this.add(d);let f=new a(e,i,6),p=new l;p.position.set(-10.906,2.009,1.846),p.rotation.set(0,-.195,0),p.scale.set(2.328,7.905,4.651),p.updateMatrix(),f.setMatrixAt(0,p.matrix),p.position.set(-5.607,-.754,-.758),p.rotation.set(0,.994,0),p.scale.set(1.97,1.534,3.955),p.updateMatrix(),f.setMatrixAt(1,p.matrix),p.position.set(6.167,.857,7.803),p.rotation.set(0,.561,0),p.scale.set(3.927,6.285,3.687),p.updateMatrix(),f.setMatrixAt(2,p.matrix),p.position.set(-2.017,.018,6.124),p.rotation.set(0,.333,0),p.scale.set(2.002,4.566,2.064),p.updateMatrix(),f.setMatrixAt(3,p.matrix),p.position.set(2.291,-.756,-2.621),p.rotation.set(0,-.286,0),p.scale.set(1.546,1.552,1.496),p.updateMatrix(),f.setMatrixAt(4,p.matrix),p.position.set(-2.193,-.369,-5.547),p.rotation.set(0,.516,0),p.scale.set(3.875,3.487,2.986),p.updateMatrix(),f.setMatrixAt(5,p.matrix),this.add(f);let m=new o(e,w(50));m.position.set(-16.116,14.37,8.208),m.scale.set(.1,2.428,2.739),this.add(m);let h=new o(e,w(50));h.position.set(-16.109,18.021,-8.207),h.scale.set(.1,2.425,2.751),this.add(h);let g=new o(e,w(17));g.position.set(14.904,12.198,-1.832),g.scale.set(.15,4.265,6.331),this.add(g);let _=new o(e,w(43));_.position.set(-.462,8.89,14.52),_.scale.set(4.38,5.441,.088),this.add(_);let v=new o(e,w(20));v.position.set(3.235,11.486,-12.541),v.scale.set(2.5,2,.1),this.add(v);let y=new o(e,w(100));y.position.set(0,20,0),y.scale.set(1,.1,1),this.add(y)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function w(e){return new s({color:0,emissive:16777215,emissiveIntensity:e})}function T(t,n,{intensity:r=1,envScene:i}={}){let a=new e.PMREMGenerator(n),o=i??new C,s=a.fromScene(o,.04).texture;return t.environment=s,t.environmentIntensity=r,a.dispose(),i||o.traverse(e=>e.geometry?.dispose()),s}function E({color:t=`#fff5e0`,intensity:n=3,position:r=new e.Vector3(8,12,6),shadowMapSize:i=2048,shadowFrustum:a=15,shadowFar:o=30}={}){let s=new e.DirectionalLight(t,n);return s.position.copy(r),s.castShadow=!0,s.shadow.mapSize.set(i,i),s.shadow.camera.near=1,s.shadow.camera.far=o,s.shadow.camera.top=a,s.shadow.camera.right=a,s.shadow.camera.bottom=-a,s.shadow.camera.left=-a,s.shadow.bias=-1e-4,s.shadow.normalBias=.02,s}function D({skyColor:t=`#a0c0ff`,groundColor:n=`#3a2a1a`,intensity:r=.4}={}){return new e.HemisphereLight(t,n,r)}function O(e,t,n={}){let r=T(e,t,n.env),i=E(n.sun),a=D(n.hemi);return e.add(i,i.target,a),{env:r,sun:i,hemi:a,dispose(){r.dispose(),e.remove(i,i.target,a)}}}function k(e){let t=e>>>0;return function(){t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function A(e,t,n){let r=Math.max(0,Math.min(1,(n-e)/(t-e)));return r*r*(3-2*r)}function j(e,t){let n=(2166136261^t)>>>0;for(let t=0;t<e.length;t++)n^=e.charCodeAt(t),n=Math.imul(n,16777619);return n>>>0}function M(e){let t=e>>>0,n=k(t);return{next:n,range(e,t){return e+n()*(t-e)},int(e,t){return Math.floor(e+n()*(t-e+1))},pick(e){if(e.length===0)throw Error(`createSeededRng.pick: empty array`);return e[Math.floor(n()*e.length)]},fork(e){return M(j(e,t))}}}function N({canvas:t,state:n={},reducer:r,seed:i=1,clock:a=S(),renderer:o,camera:s,background:c=`#0a0a14`,lighting:l=!0,orbit:u=!0,modules:d=[],onFrame:m,onResize:h,render:g}){if(!t)throw Error(`createApp: canvas required`);let _=f({canvas:t,...o}),v=new e.Scene;v.background=new e.Color(c);let x;if(s instanceof e.Camera)x=s;else{let n=t.clientWidth/t.clientHeight||1,r=new e.PerspectiveCamera(s?.fov??50,n,s?.near??.1,s?.far??200);r.position.set(...s?.position??[4,3,6]),r.lookAt(new e.Vector3(...s?.lookAt??[0,0,0])),x=r}let ee=l?O(v,_):null,C=ne(n,r),w=M(i),T=y(),E={scene:v,camera:x,renderer:_,rng:w,loop:T},D=null;if(u){let e=Math.atan2(x.position.x,x.position.z),n=Math.atan2(x.position.y,Math.hypot(x.position.x,x.position.z)),r=x.position.length(),i=()=>{let t=r*Math.cos(n);x.position.set(Math.sin(e)*t,Math.sin(n)*r,Math.cos(e)*t),x.lookAt(0,0,0)};D=b(t,{onDrag(t,r){e-=t*.005,n=Math.max(-1.4,Math.min(1.4,n+r*.005)),i()},onPinch(e){r=Math.max(2,Math.min(50,r/e)),i()},onWheel(e){r=Math.max(2,Math.min(50,r*(1+e*.001))),i()}})}let k=p(_,x,t,h);for(let e of d)e.build(E);_.compile(v,x);let A=0;function j(e){A+=1;let t={delta:e,elapsed:a.elapsed(),frame:A},n=C.get();for(let e of d)e.update?.(n,t,E);m?.(n,t,E)}function N(e){for(let t of a.advance(e))j(t);g?g():_.render(v,x)}let re=T.onFrame(({delta:e})=>N(e));return T.stop(),{ctx:E,store:C,getState:C.get,setState:e=>C.set(e),dispatch:e=>C.dispatch(e),tick(e=1/60){N(e)},start:()=>T.start(),stop:()=>T.stop(),dispose(){re(),T.dispose(),D?.(),k(),ee?.dispose();for(let e of d)e.dispose();te(v),_.dispose()}}}function re(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),a=new Set(Object.keys(e[0].morphAttributes)),o={},s={},c=e[0].morphTargetsRelative,l=new i,u=0;for(let i=0;i<e.length;++i){let d=e[i],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. Make sure all geometries have the same number of attributes.`),null;if(c!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!a.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`.  .morphAttributes must be consistent throughout all geometries.`),null;s[e]===void 0&&(s[e]=[]),s[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+i+`. The geometry must have either an index or a position attribute`),null;l.addGroup(u,e,i),u+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}l.setIndex(n)}for(let e in o){let t=ie(o[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;l.setAttribute(e,t)}for(let e in s){let t=s[e][0].length;if(t!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<s[e].length;++r)t.push(s[e][r][n]);let r=ie(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;l.morphAttributes[e].push(r)}}}return l}function ie(e){let t,n,i,a=-1,o=0;for(let r=0;r<e.length;++r){let s=e[r];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(i===void 0&&(i=s.normalized),i!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(a===-1&&(a=s.gpuType),a!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;o+=s.count*n}let s=new t(o),c=new r(s,n,i),l=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=l/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);c.setComponent(t+e,i,n)}}else s.set(r.array,l);l+=r.count*n}return a!==void 0&&(c.gpuType=a),c}var ae=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];function oe(e=1){let t=k(e>>>0),n=new Uint8Array(256);for(let e=0;e<256;e++)n[e]=e;for(let e=255;e>0;e--){let r=Math.floor(t()*(e+1)),i=n[e];n[e]=n[r],n[r]=i}let r=new Uint8Array(512);for(let e=0;e<512;e++)r[e]=n[e&255];let i=1/6;function a(e,t,n,r){return e[0]*t+e[1]*n+e[2]*r}function o(e,t,n){let o=(e+t+n)*.3333333333333333,s=Math.floor(e+o),c=Math.floor(t+o),l=Math.floor(n+o),u=(s+c+l)*i,d=e-(s-u),f=t-(c-u),p=n-(l-u),m=0,h=0,g=0,_=0,v=0,y=0;d>=f?f>=p?(m=1,_=1,v=1):d>=p?(m=1,_=1,y=1):(g=1,_=1,y=1):f<p?(g=1,v=1,y=1):d<p?(h=1,v=1,y=1):(h=1,_=1,v=1);let b=d-m+i,x=f-h+i,ee=p-g+i,te=d-_+2*i,S=f-v+2*i,ne=p-y+2*i,C=d-1+3*i,w=f-1+3*i,T=p-1+3*i,E=s&255,D=c&255,O=l&255,k=0,A=.6-d*d-f*f-p*p;if(A>0){A*=A;let e=r[E+r[D+r[O]]]%12;k+=A*A*a(ae[e],d,f,p)}let j=.6-b*b-x*x-ee*ee;if(j>0){j*=j;let e=r[E+m+r[D+h+r[O+g]]]%12;k+=j*j*a(ae[e],b,x,ee)}let M=.6-te*te-S*S-ne*ne;if(M>0){M*=M;let e=r[E+_+r[D+v+r[O+y]]]%12;k+=M*M*a(ae[e],te,S,ne)}let N=.6-C*C-w*w-T*T;if(N>0){N*=N;let e=r[E+1+r[D+1+r[O+1]]]%12;k+=N*N*a(ae[e],C,w,T)}return 32*k}function s(e,t,n,r=4,i=2,a=.5){let s=0,c=.5,l=1;for(let u=0;u<r;u++)s+=c*o(e*l,t*l,n*l),l*=i,c*=a;return s}function c(e,t,n,r=4,i=2,a=.5){let s=0,c=.5,l=1;for(let u=0;u<r;u++)s+=c*(1-Math.abs(o(e*l,t*l,n*l))),l*=i,c*=a;return s}return{sample:o,fbm:s,ridged:c}}var se={mobile:{pixelRatio:1.5,shadowMapSize:1024,shadowsEnabled:!0,postFx:[`bloom`],chunkViewRadius:2,particleBudget:5e3,maxLights:2},desktop:{pixelRatio:2,shadowMapSize:2048,shadowsEnabled:!0,postFx:[`bloom`,`dof`,`filmGrain`],chunkViewRadius:4,particleBudget:5e4,maxLights:4},highEnd:{pixelRatio:2,shadowMapSize:4096,shadowsEnabled:!0,postFx:[`bloom`,`dof`,`godRays`,`filmGrain`,`glitch`],chunkViewRadius:6,particleBudget:25e4,maxLights:8}};function ce(){let e=navigator.maxTouchPoints>0&&window.innerWidth<1280,t=navigator.hardwareConcurrency||4,n=window.devicePixelRatio||1;return e||t<=4?`mobile`:t>=8&&n>=2?`highEnd`:`desktop`}function le(e=ce()){return{tier:e,...se[e]}}var P=[{name:`hero`,at:[84,104],height:5,look:[6,34],lookHeight:12},{name:`landing`,at:[56.3,103.3],height:2.4,look:[36,74],lookHeight:3,walk:!0},{name:`climb`,at:[31.3,45.5],height:3,look:[14,58],lookHeight:5},{name:`island`,at:[150,150],height:40,look:[10,20],lookHeight:10},{name:`summit`,at:[2,86],height:28,look:[28,-40],lookHeight:4},{name:`shore`,at:[-96,44],height:2.6,look:[-24,-6],lookHeight:7},{name:`cove`,at:[-38,-104],height:4.5,look:[4,-12],lookHeight:9},{name:`ridge`,at:[8,-34],height:13,look:[58,62],lookHeight:3},{name:`east`,at:[112,52],height:9,look:[18,50],lookHeight:8}];function ue(e,t,n){return Math.max(e.heightAt(t,n),e.waterLevel)}function de(e,t){let[n,r]=e.at,[i,a]=e.look;return{position:[n,ue(t,n,r)+e.height,r],target:[i,ue(t,i,a)+e.lookHeight,a]}}function fe(e){return P.find(t=>t.name===e)}function pe(e,t,n){let r=e.onBeforeCompile,i=e.customProgramCacheKey;e.onBeforeCompile=function(e,t){r.call(this,e,t),n(e)},e.customProgramCacheKey=function(){return`${i.call(this)}+${t}`}}function F(e,t,n){if(!e.includes(t))throw Error(`the shader has no "${t}" to add after`);return e.replace(t,`${t}\n${n}`)}var I=new e.Vector3(-.62,.46,.3).normalize(),L=2e3,me=-1.2,he=7,ge=1470,_e=Math.PI*2,ve=[{x:12,z:-31,weight:.5,phase:0},{x:28,z:-52,weight:.3,phase:1.3},{x:8,z:5,weight:.2,phase:4.1}],R=`
  #ifndef WIND_GLSL
  #define WIND_GLSL

  uniform vec2 uWindDrift;

  const float WEATHER_SPAN = ${z(L)};
  const vec2  WIND         = vec2(${Math.cos(me)}, ${Math.sin(me)});

  // A place, in the air's own frame: where the air now here started from, as
  // an angle that goes round once across the span.
  vec2 windFrame (vec2 at) {
    return (at - uWindDrift) * ${_e/L};
  }

  // 0 in a lull, 1 in a gust.
  float windGust (vec2 at) {
    vec2 air = windFrame(at);

    return 0.5 + 0.5 * (${ve.map(e=>`${z(e.weight)} * sin(dot(air, vec2(${z(e.x)}, ${z(e.z)})) + ${z(e.phase)})`).join(` + `)});
  }

  #endif
`;function z(e){return Number.isInteger(e)?e.toFixed(1):String(e)}function ye(e,t){return(e%t+t)%t}function be(){let t=[Math.cos(me),Math.sin(me)],n={uWindDrift:{value:new e.Vector2}};return{direction:t,speed:he,uniforms:n,blow(e){let r=he*(e+ge);n.uWindDrift.value.set(ye(t[0]*r,L),ye(t[1]*r,L))},gustAt(e,n,r){let i=he*(r+ge),a=(e-t[0]*i)*_e/L,o=(n-t[1]*i)*_e/L,s=0;for(let e of ve)s+=e.weight*Math.sin(a*e.x+o*e.z+e.phase);return .5+.5*s}}}var xe=.68,Se=.22,Ce=.3,we=1.7,Te=[.42,.58],Ee=[I.x/I.y,I.z/I.y],De=`
  uniform sampler2D uCloudShadow;

  // Where in the picture of the sky to look for a point in the world: up the
  // sun's ray to the height the clouds ride at, then back to where the air
  // that is there now started from.
  vec2 cloudShadowUv (vec3 at) {
    vec2 under = at.xz + vec2(${Ee[0]}, ${Ee[1]}) * (${120 .toFixed(1)} - at.y);

    return (under - uWindDrift) / WEATHER_SPAN + 0.5;
  }

  // How much of the sun gets through: 1 in the open, less under a cloud.
  float cloudLight (vec2 uv) {
    return 1.0 - ${xe} * smoothstep(${Te[0]}, ${Te[1]}, texture2D(uCloudShadow, uv).r);
  }
`;function Oe(){return{uniforms:{uCloudShadow:{value:null}}}}function ke(e,t){let n=new Uint8Array(t*t),r=L/t,i=L/2;for(let a of e){let e=a.x+Ee[0]*(120-a.y),o=a.z+Ee[1]*(120-a.y),s=Math.ceil(a.radius*we/r),c=Math.floor((e+i)/r),l=Math.floor((o+i)/r);for(let u=l-s;u<=l+s;u+=1)for(let l=c-s;l<=c+s;l+=1){let s=Math.hypot((l+.5)*r-i-e,(u+.5)*r-i-o),c=Math.round(255*(1-(s/a.radius-Ce)/1.4)),d=(u%t+t)%t*t+(l%t+t)%t;n[d]=Math.max(n[d],Math.min(255,c))}}return n}function Ae(t,n){let r=new e.DataTexture(ke(t,n),n,n,e.RedFormat,e.UnsignedByteType);return r.name=`cloud-shadow`,r.wrapS=e.RepeatWrapping,r.wrapT=e.RepeatWrapping,r.magFilter=e.LinearFilter,r.minFilter=e.LinearFilter,r.needsUpdate=!0,r}function B(e,{wind:t,clouds:n}){pe(e,`cloud-shadow`,e=>{Object.assign(e.uniforms,t.uniforms,n.uniforms),e.vertexShader=F(F(e.vertexShader,`#include <common>`,`${R}${De}varying vec2 vCloudUv;`),`#include <project_vertex>`,`
        vec4 cloudAt = vec4(transformed, 1.0);

        #ifdef USE_INSTANCING
          cloudAt = instanceMatrix * cloudAt;
        #endif

        vCloudUv = cloudShadowUv((modelMatrix * cloudAt).xyz);
      `),e.fragmentShader=F(F(e.fragmentShader,`#include <common>`,`${R}${De}varying vec2 vCloudUv;`),`#include <lights_fragment_end>`,`
        float cloudLit = cloudLight(vCloudUv);

        reflectedLight.directDiffuse   *= cloudLit;
        reflectedLight.directSpecular  *= cloudLit;
        reflectedLight.indirectDiffuse *= mix(1.0, cloudLit, ${Se});
      `)})}var je=7,V=.5;function Me({seed:e,size:t=260,relief:n=40,waterLevel:r=0}){let i=oe(e),a=t/2;function o(e,t){let o=1-A(.3,.98,Math.hypot(e,t)/a),s=i.fbm(e*.011,.5,t*.011,4),c=i.ridged(e*.0055,3.7,t*.0055,3);return r+(.2+.42*s+.78*c*c)*n*o-je*(1-o)}function s(e,t){let n=o(e+V,t)-o(e-V,t),r=o(e,t+V)-o(e,t-V);return 1-2*V/Math.hypot(n,2*V,r)}return{size:t,relief:n,waterLevel:r,heightAt:o,slopeAt:s}}var H=2,U=16,Ne=Array.from({length:U},(e,t)=>{let n=t/U*Math.PI*2,r=t%2==0?1.4:2;return[Math.round(Math.cos(n)*r),Math.round(Math.sin(n)*r)]}),Pe=.3,Fe=5,Ie=[.75,1.3],Le=6,Re=.5,ze=24,Be=.82,Ve=1,He=7,Ue=1.5,We=3,Ge=class{costs=[];states=[];swap(e,t){let n=this.costs[e],r=this.states[e];this.costs[e]=this.costs[t],this.states[e]=this.states[t],this.costs[t]=n,this.states[t]=r}get size(){return this.states.length}push(e,t){let n=this.states.length;for(this.costs.push(e),this.states.push(t);n>0;){let t=n-1>>1;if(this.costs[t]<=e)break;this.swap(n,t),n=t}}pop(){let e=this.states[0],t=this.states.length-1;this.swap(0,t),this.costs.pop(),this.states.pop();for(let n=0;;){let r=n*2+1,i=r+1,a=n;if(r<t&&this.costs[r]<this.costs[a]&&(a=r),i<t&&this.costs[i]<this.costs[a]&&(a=i),a===n)return e;this.swap(n,a),n=a}}};function Ke(e){let t=e.size/2,n={x:0,z:0,height:-1/0};for(let r=-t;r<=t;r+=H)for(let i=-t;i<=t;i+=H){let t=e.heightAt(r,i);t>n.height&&Object.assign(n,{x:r,z:i,height:t})}return{x:n.x,z:n.z}}function qe(e,t,[n,r],i){let a=0;for(;a<e.size&&e.heightAt(t.x+n*a,t.z+r*a)>e.waterLevel+i;)a+=.25;return{x:t.x+n*a,z:t.z+r*a}}function Je(e,t,n){let r=(e,t)=>Math.ceil((e-Math.min(e,t)+ze)/H),i=(e,t)=>Math.ceil((Math.max(e,t)-e+ze)/H),a=r(t.x,n.x)+i(t.x,n.x)+1,o=r(t.z,n.z)+i(t.z,n.z)+1,s=t.x-r(t.x,n.x)*H,c=t.z-r(t.z,n.z)*H,l=new Float32Array(a*o),u=new Float32Array(a*o);for(let t=0;t<o;t+=1)for(let n=0;n<a;n+=1)l[t*a+n]=e.heightAt(s+n*H,c+t*H);for(let e=1;e<o-1;e+=1)for(let t=1;t<a-1;t+=1){let n=e*a+t;u[n]=Math.hypot(l[n+1]-l[n-1],l[n+a]-l[n-a])/4}return{columns:a,rows:o,x:s,z:c,height:l,steep:u,dry:e.waterLevel+Re}}function Ye(e,t){return Math.round((t.z-e.z)/H)*e.columns+Math.round((t.x-e.x)/H)}function Xe(e,t,n){let r=t%e.columns+Ne[n][0],i=Math.floor(t/e.columns)+Ne[n][1];if(r<1||i<1||r>e.columns-2||i>e.rows-2)return-1;let a=i*e.columns+r;return e.height[a]>e.dry?a:-1}function Ze(e,t,n,r){let i=Math.hypot(Ne[r][0],Ne[r][1])*H,a=Math.abs(e.height[n]-e.height[t])/i,o=A(Ie[0],Ie[1],e.steep[n]);return i*(1+(a/Pe)**2)*(1+Le*o)}function Qe(e,t,n){let r=e.columns*e.rows*U,i=new Float32Array(r).fill(1/0),a=new Int32Array(r).fill(-1),o=new Uint8Array(r),s=new Ge,c=Array.from({length:U},(e,t)=>Fe/2*(1-Math.cos(t/U*Math.PI*2)));for(let e=0;e<U;e+=1)i[t*U+e]=0,s.push(0,t*U+e);for(;s.size>0;){let t=s.pop(),r=Math.floor(t/U);if(r===n)return $e(a,t);if(!o[t]){o[t]=1;for(let n=0;n<U;n+=1){let o=Xe(e,r,n);if(o<0)continue;let l=o*U+n,u=i[t]+Ze(e,r,o,n)+c[Math.abs(n-t%U)];u<i[l]&&(i[l]=u,a[l]=t,s.push(u,l))}}}return[t,n]}function $e(e,t){let n=[];for(let r=t;r>=0;r=e[r])n.unshift(Math.floor(r/U));return n}function et(e){let t=[e[0]];for(let n=0;n<e.length-1;n+=1){let r=e[n],i=e[n+1];t.push({x:r.x*.75+i.x*.25,z:r.z*.75+i.z*.25},{x:r.x*.25+i.x*.75,z:r.z*.25+i.z*.75})}return t.push(e.at(-1)),t}function tt(e){let t=0;for(let n=1;n<e.length;n+=1)t+=Math.hypot(e[n].x-e[n-1].x,e[n].z-e[n-1].z);return t}function nt(e){let t=tt(e),n=Math.max(1,Math.round(t/Ue)),r=[e[0]],i=0,a=1;for(let o=1;o<n;o+=1){let s=o/n*t;for(;;){let t=Math.hypot(e[a].x-e[a-1].x,e[a].z-e[a-1].z);if(i+t>=s||a===e.length-1){let n=t>0?(s-i)/t:0;r.push({x:e[a-1].x+(e[a].x-e[a-1].x)*n,z:e[a-1].z+(e[a].z-e[a-1].z)*n});break}i+=t,a+=1}}return r.push(e.at(-1)),r}function rt(e,t,n,r){let i=r.x-n.x,a=r.z-n.z,o=i*i+a*a,s=o>0?Math.min(1,Math.max(0,((e-n.x)*i+(t-n.z)*a)/o)):0;return Math.hypot(e-n.x-i*s,t-n.z-a*s)}function it(e,t=Ke(e)){let n=[Math.cos(Be),Math.sin(Be)],r=qe(e,t,n,Ve),i=qe(e,t,n,0),a=Je(e,r,t),o=[i,...Qe(a,Ye(a,r),Ye(a,t)).map(e=>({x:a.x+e%a.columns*H,z:a.z+Math.floor(e/a.columns)*H})).filter(e=>Math.hypot(e.x-t.x,e.z-t.z)>He)];for(let e=0;e<We;e+=1)o=et(o);let s=nt(o),c=tt(s),l=c/(s.length-1);return{points:s,length:c,spacing:l,landing:{...i,seaward:n},at(e){let t=Math.min(s.length-2,Math.max(0,Math.floor(e/l))),n=s[t],r=s[t+1],i=Math.min(1,Math.max(0,e/l-t)),a=Math.hypot(r.x-n.x,r.z-n.z)||1;return{x:n.x+(r.x-n.x)*i,z:n.z+(r.z-n.z)*i,ahead:[(r.x-n.x)/a,(r.z-n.z)/a]}},distanceTo(e,t){let n=1/0;for(let r=1;r<s.length;r+=1)n=Math.min(n,rt(e,t,s[r-1],s[r]));return n}}}var W=1/60,at=20261123;function ot({seed:e,quality:t}){let n=Me({seed:e}),r=Ke(n);return{seed:e,quality:t,ground:n,wind:be(),clouds:Oe(),summit:r,path:it(n,r)}}var st=4;function ct(e){return e instanceof Error?e.message:String(e)}function lt({app:t,rig:n,painter:r,canvas:i,capturing:a}){let o=[],s=()=>void 0,c=e=>void 0,l=new Promise((e,t)=>{s=e,c=t});l.catch(()=>void 0),window.addEventListener(`error`,e=>o.push(e.message)),window.addEventListener(`unhandledrejection`,e=>o.push(ct(e.reason)));async function u({view:o=`hero`,t:s=10,width:c,height:u,type:d=`image/png`,quality:f,warmup:p=st}){if(!a)throw Error(`capture needs the page loaded with ?harness=1`);await l;let m=Math.round(s/W);if(r.frame>m)throw Error(`second ${s} has passed (the world is at step ${r.frame}) · reload to capture an earlier moment`);let{renderer:h,camera:g}=t.ctx;for(h.setPixelRatio(1),h.setSize(c,u,!1),g instanceof e.PerspectiveCamera&&(g.aspect=c/u,g.updateProjectionMatrix()),n.pin(o),r.hold=!0;r.frame<m;)t.tick(W);r.hold=!1,n.place(g);for(let e=0;e<p;e+=1)r.paint();return r.paint(),i.toDataURL(d,f)}return window.__SCENERY__={contract:1,ready:l,views:P.map(e=>e.name),capture:u,pose:()=>n.pose(),errors:o},{ready(){window.__SCENE_READY__=!0,s()},fail(e){o.push(ct(e)),c(e)}}}var ut=[`mobile`,`desktop`,`highEnd`];function dt(e){let t=new URLSearchParams(e),n=t.get(`tier`),r=Number(t.get(`seed`));return{harness:t.get(`harness`)===`1`,tier:ut.find(e=>e===n)??null,seed:Number.isInteger(r)&&r>0?r:at}}var ft=[`KeyW`,`ArrowUp`],pt=[`KeyS`,`ArrowDown`],mt=[`KeyA`,`ArrowLeft`],ht=[`KeyD`,`ArrowRight`],gt=[`Space`],_t=[`KeyC`,`ControlLeft`],vt=[`ShiftLeft`,`ShiftRight`],yt=new Set([...ft,...pt,...mt,...ht,...gt,..._t]);function bt(){return{dragX:0,dragY:0,zoom:1,moveX:0,moveZ:0,lift:0,sprint:!1}}function xt(e){e.dragX=0,e.dragY=0,e.zoom=1}function St(e){return Math.min(1,Math.max(-1,e))}function Ct(e){return e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement}function wt({canvas:e,stick:t,input:n,onMove:r}){let i=new Set,a={x:0,y:0},o=e=>+!!e.some(e=>i.has(e)),s=()=>{n.moveX=St(o(ht)-o(mt)+a.x),n.moveZ=St(o(ft)-o(pt)-a.y),n.lift=o(gt)-o(_t),n.sprint=o(vt)===1},c=b(e,{onDrag(e,t){n.dragX+=e,n.dragY+=t},onPinch(e){n.zoom/=e},onWheel(e){n.zoom*=1+e*.001}}),l=e=>{Ct(e.target)||e.metaKey||e.altKey||(vt.includes(e.code)&&i.add(e.code),yt.has(e.code)&&(e.preventDefault(),i.add(e.code),r()),s())},u=e=>{i.delete(e.code),s()},d=()=>{i.clear(),a.x=0,a.y=0,s()},f=e=>{if(!t)return;let n=t.getBoundingClientRect(),r=n.width/2,i=(e.clientX-n.left-r)/r,o=(e.clientY-n.top-r)/r,c=Math.max(1,Math.hypot(i,o));a.x=i/c,a.y=o/c,t.style.setProperty(`--stick-x`,String(a.x)),t.style.setProperty(`--stick-y`,String(a.y)),s()},p=e=>{t?.setPointerCapture(e.pointerId),r(),f(e)},m=e=>{t?.hasPointerCapture(e.pointerId)&&f(e)},h=()=>{a.x=0,a.y=0,t?.style.setProperty(`--stick-x`,`0`),t?.style.setProperty(`--stick-y`,`0`),s()};return window.addEventListener(`keydown`,l),window.addEventListener(`keyup`,u),window.addEventListener(`blur`,d),t?.addEventListener(`pointerdown`,p),t?.addEventListener(`pointermove`,m),t?.addEventListener(`pointerup`,h),t?.addEventListener(`pointercancel`,h),()=>{c(),window.removeEventListener(`keydown`,l),window.removeEventListener(`keyup`,u),window.removeEventListener(`blur`,d),t?.removeEventListener(`pointerdown`,p),t?.removeEventListener(`pointermove`,m),t?.removeEventListener(`pointerup`,h),t?.removeEventListener(`pointercancel`,h)}}var Tt=[8,14,20],Et=.5,Dt=.3,Ot=.3,kt=5,At=6,jt=.12,Mt=[0,0,0],Nt=[0,0,0],Pt=[0,0,0];function Ft(e){let t=Math.min(1,Math.max(0,e));return t*t*(3-2*t)}function It({line:e,reach:t},n,r){let i=1;for(;i<e.length-1&&t[i]<n;)i+=1;let a=e[i-1],o=e[i],s=t[i]-t[i-1],c=s>0?Math.min(1,Math.max(0,(n-t[i-1])/s)):0;for(let e=0;e<3;e+=1)r[e]=a[e]+(o[e]-a[e])*c}function Lt(e,t,n){n[0]=0,n[1]=-1.2,n[2]=0;for(let r of Tt){It(e,t+r,Nt);for(let e=0;e<3;e+=1)n[e]+=Nt[e]/Tt.length}}function Rt(e,t){It(e,t,Mt),Lt(e,t,Pt);let n=Pt.map((e,t)=>e-Mt[t]),r=Math.hypot(n[0],n[1],n[2])||1;return n.map(e=>e/r)}function zt(e){return e.map((t,n)=>{let r=0;for(let t=-5;t<=kt;t+=1)r+=e[Math.min(e.length-1,Math.max(0,n+t))];return r/11})}function Bt(e,t){let n=Math.max(1,Math.ceil(e.length/Et)),r=e.length/n,i=Array.from({length:n+1},(t,n)=>Rt(e,n*r)),a=zt(zt(Array.from({length:n},(e,n)=>{let[a,o,s]=i[n],[c,l,u]=i[n+1],d=Math.acos(Math.min(1,a*c+o*l+s*u))/r;return Math.min(t,Math.max(t*Ot,Dt/d))}))),o=[0];return a.forEach((t,n)=>{let i=(n+.5)*r,a=jt+.88*Ft(Math.min(i,e.length-i)/At);o.push(o[n]+r/(t*a))}),o}function Vt(e,t,n,{way:r,pace:i}){let a=[e,...r,t,n].map(([e,t,n])=>[e,t,n]),o=[0];for(let e=1;e<a.length;e+=1){let[t,n,r]=a[e],[i,s,c]=a[e-1];o.push(o[e-1]+Math.hypot(t-i,n-s,r-c))}let s=o.at(-2),c=Bt({line:a,reach:o,length:s},i);return{line:a,reach:o,length:s,clock:c,travel:c.at(-1)}}function Ht(e,t,n,r){let{clock:i}=e,a=0,o=i.length-1;for(;o-a>1;){let e=a+o>>1;i[e]<=t?a=e:o=e}let s=i[o]-i[a],c=s>0?Math.min(1,Math.max(0,(t-i[a])/s)):0,l=(a+c)*e.length/(i.length-1);It(e,l,n),Lt(e,l,r)}var Ut=64,Wt=.3,Gt=.14;function Kt(e,t,n,r,i){let a=i*i,o=a*i;return .5*(2*t+(n-e)*i+(2*e-5*t+4*n-r)*a+(3*t-e-3*n+r)*o)}function qt(e){return Math.sin(Math.PI*e)}function Jt(e,t,n,r){let i=e.length,a=e[(t+i-1)%i],o=e[t],s=e[(t+1)%i],c=e[(t+2)%i];for(let e=0;e<3;e+=1)r.position[e]=Kt(a.position[e],o.position[e],s.position[e],c.position[e],n),r.target[e]=Kt(a.target[e],o.target[e],s.target[e],c.target[e],n);return r}function Yt(e,t,n){let r={position:[0,0,0],target:[0,0,0]},i=0;for(let a=1;a<Ut;a+=1){let o=a/Ut,[s,c,l]=Jt(e,t,o,r).position,u=n.clearance*Math.min(1,qt(o)/Wt);i=Math.max(i,(n.surface(s,l)+u-c)/qt(o))}return i}function Xt(e,{dwell:t=5,travel:n=15,floor:r,walks:i=[]}={}){if(e.length===0)throw Error(`a tour needs at least one view`);let a=e.map((t,n)=>{let r=i[n],a=e[(n+1)%e.length];return r?Vt(t.position,a.position,a.target,r):null}),o=[0];for(let e of a)o.push(o.at(-1)+t+(e?.travel??n));return{poses:e,dwell:t,travel:n,starts:o,walks:a,rise:e.map((t,n)=>r&&!a[n]?Yt(e,n,r):0)}}function Zt(e){let t=Math.min(1,Math.max(0,e));return t*t*t*(t*(t*6-15)+10)}function Qt(e,t,n,r,i){let a=e.poses[t],o=e.poses[(t+1)%e.poses.length],s=1-Zt(r/Gt),c=Zt((r-1+Gt)/Gt);Ht(n,r*n.travel,i.position,i.target);for(let e=0;e<3;e+=1)i.target[e]+=(a.target[e]-i.target[e])*s,i.target[e]+=(o.target[e]-i.target[e])*c;return i}function $t(e,t,n){let r=e.poses.length,i=e.starts[r],a=(t%i+i)%i,o=0;for(;o<r-1&&a>=e.starts[o+1];)o+=1;let s=e.walks[o],c=(a-e.starts[o]-e.dwell)/(s?.travel??e.travel);if(s)Qt(e,o,s,Math.min(1,Math.max(0,c)),n);else{let t=Zt(c);Jt(e.poses,o,t,n),n.position[1]+=e.rise[o]*qt(t)}return n.position[0]+=Math.sin(t*.21)*.6,n.position[1]+=Math.sin(t*.17)*.3,n.position[2]+=Math.cos(t*.19)*.6,n}var en=3;function tn(e,[t,,n]){let r=0;return e.points.forEach((i,a)=>{Math.hypot(i.x-t,i.z-n)<Math.hypot(e.points[r].x-t,e.points[r].z-n)&&(r=a)}),r}function nn(e,t,n,r){let i=tn(t,n.position),a=tn(t,r.position),o=a<i?-1:1,s=[];for(let n=i;n!==a+o;n+=o){let{x:r,z:i}=t.points[n];s.push([r,Math.max(e.heightAt(r,i),e.waterLevel)+3,i])}return{way:s,pace:en}}function rn(e,t){let n=(t,n)=>Math.max(e.heightAt(t,n),e.waterLevel),r=P.map(t=>de(t,e)),i=P.map((n,i)=>n.walk?nn(e,t,r[i],r[(i+1)%r.length]):null);return Xt(r,{floor:{surface:n,clearance:5},walks:i})}var an=1.7,on=.0045,sn=4,cn=240,ln=9,un=26,dn=.7,fn=5,pn=1.2,mn={position:[0,0,0],target:[0,0,0]};function G(e,t,n){return Math.min(n,Math.max(t,e))}function hn(e,t){for(let n=0;n<3;n+=1)t.position[n]=e.position[n],t.target[n]=e.target[n]}function gn(e,t,n){return Math.max(e.heightAt(t,n),e.waterLevel)}function _n(){return{mode:`tour`,pose:{position:[0,0,0],target:[0,0,0]},theta:0,phi:0,radius:sn,idle:0,returning:!1,blend:0,from:{position:[0,0,0],target:[0,0,0]},yaw:0,pitch:0}}function vn(e){let{position:t,target:n}=e.pose,r=t[0]-n[0],i=t[1]-n[1],a=t[2]-n[2],o=G(Math.hypot(r,i,a),sn,cn);e.radius=o,e.theta=Math.atan2(r,a),e.phi=Math.asin(G(i/o,-1,1)),e.mode=`orbit`,e.returning=!1,e.idle=0}function yn(e,t,n){let{position:r,target:i}=e.pose;e.theta-=t.dragX*on,e.phi=G(e.phi+t.dragY*on,-.2,1.45),e.radius=G(e.radius*t.zoom,sn,cn);let a=Math.cos(e.phi)*e.radius,o=i[0]+Math.sin(e.theta)*a,s=i[2]+Math.cos(e.theta)*a;r[0]=o,r[2]=s,r[1]=Math.max(i[1]+Math.sin(e.phi)*e.radius,gn(n,o,s)+pn)}function bn(e){let{position:t,target:n}=e.pose,r=n[0]-t[0],i=n[1]-t[1],a=n[2]-t[2],o=Math.hypot(r,i,a)||1;e.yaw=Math.atan2(r,a),e.pitch=Math.asin(G(i/o,-1,1)),e.mode=`explore`,e.returning=!1}function xn(e,t,n,r){let{position:i,target:a}=e.pose;e.yaw-=t.dragX*on,e.pitch=G(e.pitch-t.dragY*on,-1.35,1.35);let o=t.sprint?un:ln,s=Math.sin(e.yaw),c=Math.cos(e.yaw),l=i[0]+(s*t.moveZ-c*t.moveX)*o*n,u=i[2]+(c*t.moveZ+s*t.moveX)*o*n,d=r.size*.49,f=Math.hypot(l,u);f>d&&(l*=d/f,u*=d/f);let p=gn(r,l,u)+an,m=i[1]+t.lift*o*dn*n;t.lift<=0&&(m-=fn*n),i[0]=l,i[1]=Math.max(m,p),i[2]=u;let h=Math.cos(e.pitch);a[0]=l+s*h*10,a[1]=i[1]+Math.sin(e.pitch)*10,a[2]=u+c*h*10}function Sn(e){hn(e.pose,e.from),e.blend=0,e.returning=!0,e.mode=`tour`}function Cn(e,t,n,r,i){if($t(i.tour,n,mn),i.explore)return e.mode!==`explore`&&bn(e),xn(e,t,r,i.ground),e;if(e.mode===`explore`&&Sn(e),t.dragX!==0||t.dragY!==0||t.zoom!==1)return e.mode!==`orbit`&&vn(e),yn(e,t,i.ground),e.idle=0,e;if(e.mode===`orbit`){if(e.idle+=r,e.idle<8)return e;Sn(e)}if(e.returning){e.blend=Math.min(1,e.blend+r/3);let t=Zt(e.blend);for(let n=0;n<3;n+=1)e.pose.position[n]=e.from.position[n]+(mn.position[n]-e.from.position[n])*t,e.pose.target[n]=e.from.target[n]+(mn.target[n]-e.from.target[n])*t;return e.blend>=1&&(e.returning=!1),e}return hn(mn,e.pose),e}function wn({world:t,canvas:n,stick:r=null,interactive:i,onMove:a}){let{ground:o}=t,s=rn(o,t.path),c=_n(),l=bt(),u={tour:s,ground:o,explore:!1},d=new e.Vector3,f=null,p=null,m=()=>void 0;function h(e){let t=f??c.pose;e.position.set(t.position[0],t.position[1],t.position[2]),e.lookAt(d.set(t.target[0],t.target[1],t.target[2]))}return{module:{name:`rig`,build(e){p=e.camera,i&&(m=wt({canvas:n,stick:r,input:l,onMove:a})),Cn(c,l,0,0,u),h(e.camera)},update(e,t,n){u.explore=e.explore,Cn(c,l,t.frame*W,W,u),xt(l),h(n.camera)},dispose(){m(),p=null}},pin(e){if(e===null){f=null;return}let t=fe(e);if(!t)throw Error(`no view named "${e}" · known: ${P.map(e=>e.name).join(`, `)}`);f=de(t,o)},place:h,pose(){let{x:t,y:n,z:r}=p?.position??d.set(0,0,0),{x:i,y:a,z:o,w:s}=p?.quaternion??new e.Quaternion;return{position:[t,n,r],quaternion:[i,a,o,s],mode:f?`tour`:c.mode}}}}var Tn=2,En=`scenery:context-reloads`;function Dn(e){document.documentElement.dataset.sceneryState=e}function On(){try{return Number(window.sessionStorage.getItem(En)??0)}catch{return Tn}}function kn(e){try{window.sessionStorage.setItem(En,String(e))}catch{}}function An(e){e.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),Dn(`lost`)}),e.addEventListener(`webglcontextrestored`,()=>{let e=On();e>=Tn||(kn(e+1),window.location.reload())})}function jn(e){let t=document.documentElement,n=document.querySelector(`nav button`),r=e=>{t.dataset.sceneryMode=e.explore?`explore`:`tour`,n&&(n.setAttribute(`aria-pressed`,String(e.explore)),n.textContent=e.explore?`Back to the tour`:`Explore`)};n?.addEventListener(`click`,()=>e.setState({explore:!e.getState().explore})),window.addEventListener(`keydown`,t=>{t.code===`Escape`&&e.getState().explore&&e.setState({explore:!1})}),e.store.subscribe(r),r(e.getState())}function Mn(e){let t=document.querySelector(`output`);t&&(t.textContent=e)}function Nn(e){e.instanceMatrix.needsUpdate=!0,e.instanceColor&&(e.instanceColor.needsUpdate=!0),e.computeBoundingSphere()}function K(t){t&&(t.geometry.dispose(),t.material instanceof e.Material&&t.material.dispose(),t.removeFromParent(),t.dispose())}var q={zenith:`#2f5f9f`,horizon:`#d3e0ea`,sun:`#fff1d6`,skyFill:`#a9c4e8`,groundFill:`#6b6452`,sand:`#cdbf9a`,grass:`#6f8f4e`,grassDry:`#8f9a5a`,path:`#c0ad86`,rock:`#7d7a74`,cairn:`#a8a193`,waterDeep:`#1d4d68`,waterShallow:`#8fc2cc`,foam:`#eef2f5`};function Pn(t){let n=new e.IcosahedronGeometry(1,1),r=oe(t),i=n.getAttribute(`position`);for(let e=0;e<i.count;e+=1){let t=i.getX(e),n=i.getY(e),a=i.getZ(e),o=1+r.sample(t*1.3,n*1.3,a*1.3)*.3;i.setXYZ(e,t*o,n*o*.72,a*o)}return n.computeVertexNormals(),n.computeBoundingBox(),n.computeBoundingSphere(),n}var Fn=9,In=6,Ln=2.9,Rn=1,J=new e.Object3D,zn=new e.Color;function Bn(t){let n=null;return{name:`cairn`,build({scene:r,rng:i}){let{ground:a,summit:o}=t,s=i.fork(`cairn:lay`),c=Pn(i.fork(`cairn:shape`).int(1,1e6)),l=new e.MeshStandardMaterial({name:`cairn`,flatShading:!0,roughness:1,metalness:0});B(l,t),n=new e.InstancedMesh(c,l,16),n.name=`cairn`,n.castShadow=!0,n.receiveShadow=!0;let u=0,d=e=>{J.updateMatrix(),n.setMatrixAt(u,J.matrix),n.setColorAt(u,zn.set(q.cairn).offsetHSL(0,0,e)),u+=1},f=a.heightAt(o.x,o.z)-.5;for(let t=0;t<Fn;t+=1){let n=e.MathUtils.lerp(Ln,Rn,t/8),r=n*s.range(.4,.52),i=n*.12;J.position.set(o.x+s.range(-i,i),f+r*.6,o.z+s.range(-i,i)),J.rotation.set(s.range(-.06,.06),s.range(0,Math.PI*2),s.range(-.06,.06)),J.scale.set(n,r,n*s.range(.85,1.05)),d(s.range(-.05,.05)),f+=r*1.05}J.position.set(o.x,f+1.1,o.z),J.rotation.set(.05,s.range(0,Math.PI*2),-.04),J.scale.set(.7,2.4,.52),d(.04);for(let e=0;e<In;e+=1){let t=(e+s.range(-.3,.3))/In*Math.PI*2,n=Ln*s.range(1.25,1.9),r=o.x+Math.cos(t)*n,i=o.z+Math.sin(t)*n,c=s.range(.35,.75);J.position.set(r,a.heightAt(r,i)+c*.1,i),J.rotation.set(s.range(-.3,.3),s.range(0,Math.PI*2),s.range(-.3,.3)),J.scale.set(c,c*.6,c*s.range(.8,1.2)),d(s.range(-.08,.02))}Nn(n),r.add(n)},dispose(){K(n),n=null}}}var Vn=.35,Hn=170,Un=40;function Wn(e,t,n,r){let i=Math.abs(e-n),a=Math.abs(t-r);return Math.hypot(Math.min(i,L-i),Math.min(a,L-a))}function Gn(e,t){let n=e.int(4,6),r=e.range(50,150),i=r*e.range(.2,.28),a=e.range(-.3,.3),o=t[0]*Math.cos(a)-t[1]*Math.sin(a),s=t[0]*Math.sin(a)+t[1]*Math.cos(a);return Array.from({length:n},(t,a)=>{let c=a/(n-1)-.5+e.range(-.06,.06),l=i*(.55+.45*Math.cos(c*Math.PI))*e.range(.85,1.15),u=l*e.range(.56,.8),d=l*e.range(-.35,.35);return{offset:[o*c*r-s*d,u*Vn,s*c*r+o*d],scale:[l,u,l*e.range(.86,1)],turn:e.range(0,Math.PI*2)}})}function Kn({rng:e,count:t,along:n}){let r=e.fork(`place`),i=e.fork(`shape`),a=L/2,o=[];for(let e=0;o.length<t&&e<t*Un;e+=1){let e=r.range(-a,a),t=r.range(-a,a);o.every(n=>Wn(n.x,n.z,e,t)>Hn)&&o.push({x:e,y:120+i.range(-12,14),z:t,puffs:Gn(i,n)})}return o}var qn=[760,980],Jn=.0016,Yn=`
  ${R}

  attribute vec3 aCloud;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main () {
    // The cloud rides the wind, and comes round again on the far side of the
    // weather's square.
    vec2 home = mod(aCloud.xz + uWindDrift + WEATHER_SPAN * 0.5, WEATHER_SPAN) - WEATHER_SPAN * 0.5;

    // It is small when it does: grown from nothing out in the haze, and back
    // to nothing before it reaches the seam, so no cloud ever blinks.
    float presence = 1.0 - smoothstep(${qn[0].toFixed(1)}, ${qn[1].toFixed(1)}, length(home));

    // The instance matrix holds the puff's place in its cloud, not in the world.
    mat3 puff  = mat3(instanceMatrix);
    vec3 local = (instanceMatrix * vec4(position, 1.0)).xyz * presence;

    vWorld  = vec3(home.x, aCloud.y, home.y) + local;
    vNormal = puff * (normal / vec3(dot(puff[0], puff[0]), dot(puff[1], puff[1]), dot(puff[2], puff[2])));

    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`,Xn=`
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
    float far  = distance(cameraPosition, vWorld) * ${Jn};
    float haze = 1.0 - exp(-far * far);

    gl_FragColor = vec4(mix(colour, uHaze, haze), 1.0);

    #include <colorspace_fragment>
  }
`;function Zn({lit:t,shade:n,haze:r,sunDirection:i,wind:a}){return new e.ShaderMaterial({name:`cloud`,vertexShader:Yn,fragmentShader:Xn,fog:!1,uniforms:{...a,uLit:{value:new e.Color(t)},uShade:{value:new e.Color(n)},uHaze:{value:new e.Color(r)},uSunDirection:{value:i.clone()}}})}var Qn=60,$n={mobile:256,desktop:512,highEnd:512},Y=new e.Object3D;function er(t){let n=new e.IcosahedronGeometry(1,1),r=oe(t),i=n.getAttribute(`position`);for(let e=0;e<i.count;e+=1){let t=i.getX(e),n=i.getY(e),a=i.getZ(e),o=1+r.sample(t*1.1,n*1.1,a*1.1)*.14;i.setXYZ(e,t*o,Math.max(n*o,-Vn),a*o)}return n.computeVertexNormals(),n}function tr(t){let n=null,r=null;return{name:`clouds`,build({scene:i,rng:a}){let o=Kn({rng:a.fork(`clouds:layout`),count:Qn,along:t.wind.direction}),s=o.reduce((e,t)=>e+t.puffs.length,0),c=er(a.fork(`clouds:puff`).int(1,1e6)),l=new Float32Array(s*3),u=Zn({lit:q.sun,shade:new e.Color(q.skyFill).lerp(new e.Color(q.horizon),.3),haze:q.horizon,sunDirection:I,wind:t.wind.uniforms});n=new e.InstancedMesh(c,u,s),n.name=`clouds`,n.frustumCulled=!1;let d=[],f=0;for(let e of o)for(let t of e.puffs)Y.position.set(...t.offset),Y.rotation.set(0,t.turn,0),Y.scale.set(...t.scale),Y.updateMatrix(),n.setMatrixAt(f,Y.matrix),l.set([e.x,e.y,e.z],f*3),f+=1,d.push({x:e.x+t.offset[0],y:e.y+t.offset[1],z:e.z+t.offset[2],radius:(t.scale[0]+t.scale[2])/2});c.setAttribute(`aCloud`,new e.InstancedBufferAttribute(l,3)),n.instanceMatrix.needsUpdate=!0,r=Ae(d,$n[t.quality.tier]),t.clouds.uniforms.uCloudShadow.value=r,i.add(n)},dispose(){K(n),r?.dispose(),t.clouds.uniforms.uCloudShadow.value=null,n=null,r=null}}}var nr=`
  varying vec3 vDirection;

  void main () {
    vDirection = normalize(position);

    // Turned with the view and never moved by it: the dome is drawn around the
    // camera wherever that is, so walking never brings its wall closer and a
    // picture from a new place needs nothing told to the sky first.
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  }
`,rr=`
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
`;function ir({zenith:t,horizon:n,sun:r,sunDirection:i}){return new e.ShaderMaterial({name:`sky`,vertexShader:nr,fragmentShader:rr,side:e.BackSide,depthWrite:!1,fog:!1,uniforms:{uZenith:{value:new e.Color(t)},uHorizon:{value:new e.Color(n)},uSun:{value:new e.Color(r)},uSunDirection:{value:i.clone()}}})}var ar=260,or=1200;function sr(t){let n=null,r=null,i=null;return{name:`environment`,build({scene:a,renderer:o}){o.shadowMap.enabled=t.quality.shadowsEnabled,o.shadowMap.type=e.PCFShadowMap,a.fog=new e.FogExp2(q.horizon,.0028),t.wind.blow(0);let s=t.ground.size*.62;r=E({color:q.sun,intensity:3.2,position:I.clone().multiplyScalar(ar),shadowMapSize:t.quality.shadowMapSize,shadowFrustum:s,shadowFar:ar*2}),r.castShadow=t.quality.shadowsEnabled,r.shadow.bias=-5e-4,r.shadow.normalBias=.16,i=D({skyColor:q.skyFill,groundColor:q.groundFill,intensity:1.7}),n=new e.Mesh(new e.SphereGeometry(or,24,12),ir({zenith:q.zenith,horizon:q.horizon,sun:q.sun,sunDirection:I})),n.name=`sky`,n.frustumCulled=!1,n.renderOrder=-1,a.add(r,r.target,i,n)},update(e,n){t.wind.blow(n.frame*W)},dispose(){n?.geometry.dispose(),n?.material instanceof e.Material&&n.material.dispose(),r?.shadow.map?.dispose(),r?.removeFromParent(),r?.target.removeFromParent(),i?.removeFromParent(),n?.removeFromParent(),n=null,r=null,i=null}}}var cr=30;function lr({ground:e,rng:t,count:n,reach:r=.9,accept:i}){let a=e.size/2*r,o=[];for(let r=0;o.length<n&&r<n*cr;r+=1){let n=Math.sqrt(t.next())*a,r=t.range(0,Math.PI*2),s=Math.cos(r)*n,c=Math.sin(r)*n,l={x:s,z:c,height:e.heightAt(s,c),slope:e.slopeAt(s,c)};i(l)&&o.push(l)}return o}var ur={mobile:60,desktop:140,highEnd:220},dr=3,fr=4,X=new e.Object3D,pr=new e.Color;function mr(t){let n=null;return{name:`rocks`,build({scene:r,rng:i}){let{ground:a,summit:o}=t,s=i.fork(`rocks:place`),c=i.fork(`rocks:shape`),l=lr({ground:a,rng:s,count:ur[t.quality.tier],accept:e=>e.height>a.waterLevel-.4&&e.slope<.5}),u=Pn(c.int(1,1e6)),d=new e.MeshStandardMaterial({name:`rock`,flatShading:!0,roughness:1,metalness:0});B(d,t),n=new e.InstancedMesh(u,d,l.length),n.name=`rocks`,n.castShadow=!0,n.receiveShadow=!0;let f=0;for(let e of l){let r=s.range(.5,2.6);X.position.set(e.x,e.height-r*.18,e.z),X.rotation.set(s.range(-.3,.3),s.range(0,Math.PI*2),s.range(-.3,.3)),X.scale.set(r,r*s.range(.7,1.1),r*s.range(.8,1.2)),X.updateMatrix(),pr.set(q.rock).offsetHSL(0,0,s.range(-.07,.07)),t.path.distanceTo(e.x,e.z)<r+dr||Math.hypot(e.x-o.x,e.z-o.z)<r+fr||(n.setMatrixAt(f,X.matrix),n.setColorAt(f,pr),f+=1)}n.count=f,Nn(n),r.add(n)},dispose(){K(n),n=null}}}var hr={mobile:160,desktop:256,highEnd:384},gr=1.35,_r=.28,vr=4,yr=2.8,br=.55,xr=.92,Sr=[.7,2.4],Cr=`
  vec3 pathAt = (modelMatrix * vec4(transformed, 1.0)).xyz;

  vPathAt = vec3((pathAt.xz - uPathFrame.xy) * uPathFrame.zw, pathAt.y);
`,wr=`
  float pathAway = (1.0 - texture2D(uPathWear, vPathAt.xy).r) * ${vr.toFixed(1)};
  float pathEdge = max(fwidth(pathAway), 0.05);
  float pathTurf = smoothstep(${Sr[0]}, ${Sr[1]}, vPathAt.z);

  diffuseColor.rgb = mix(diffuseColor.rgb, uPathVerge, ${br} * pathTurf * (1.0 - smoothstep(1.0, ${yr}, pathAway)));
  diffuseColor.rgb = mix(diffuseColor.rgb, uPathBare, ${xr} * (1.0 - smoothstep(1.0 - pathEdge, 1.0 + pathEdge, pathAway)));
`;function Tr(e){return gr*(1+_r*(.6*Math.sin(e*.31)+.4*Math.sin(e*.113+1.7)))}function Er(t,n){let{points:r}=t,i=8.912,a=Math.min(...r.map(e=>e.x))-i,o=Math.min(...r.map(e=>e.z))-i,s=Math.max(...r.map(e=>e.x))+i-a,c=Math.max(...r.map(e=>e.z))+i-o,l=Math.max(s,c)/hr[n],u=Math.ceil(s/l),d=Math.ceil(c/l),f=new Uint8Array(u*d);for(let e=1;e<r.length;e+=1){let n=r[e-1],i=r[e],s=Tr(e*t.spacing),c=Math.ceil(vr*s/l)+1,p=Math.max(0,Math.floor((Math.min(n.x,i.x)-a)/l)-c),m=Math.min(u-1,Math.floor((Math.max(n.x,i.x)-a)/l)+c),h=Math.max(0,Math.floor((Math.min(n.z,i.z)-o)/l)-c),g=Math.min(d-1,Math.floor((Math.max(n.z,i.z)-o)/l)+c);for(let e=h;e<=g;e+=1)for(let t=p;t<=m;t+=1){let r=rt(a+(t+.5)*l,o+(e+.5)*l,n,i)/s,c=Math.round(255*(1-r/vr));f[e*u+t]=Math.max(f[e*u+t],c)}}let p=new e.DataTexture(f,u,d,e.RedFormat,e.UnsignedByteType);return p.name=`path-wear`,p.magFilter=e.LinearFilter,p.minFilter=e.LinearFilter,p.needsUpdate=!0,{texture:p,frame:new e.Vector4(a,o,1/(u*l),1/(d*l))}}function Dr(t,n){let r={uPathWear:{value:n.texture},uPathFrame:{value:n.frame},uPathBare:{value:new e.Color(q.path)},uPathVerge:{value:new e.Color(q.grassDry)}};pe(t,`path-wear`,e=>{Object.assign(e.uniforms,r),e.vertexShader=F(F(e.vertexShader,`#include <common>`,`uniform vec4 uPathFrame;
varying vec3 vPathAt;`),`#include <project_vertex>`,Cr),e.fragmentShader=F(F(e.fragmentShader,`#include <common>`,`uniform sampler2D uPathWear;
uniform vec3 uPathBare;
uniform vec3 uPathVerge;
varying vec3 vPathAt;`),`#include <color_fragment>`,wr)})}var Or={mobile:96,desktop:160,highEnd:224},kr=new e.Color(q.sand),Ar=new e.Color(q.grass),jr=new e.Color(q.grassDry),Mr=new e.Color(q.rock),Nr=new e.Color;function Pr(e,t,n,r,i){let{ground:a}=e,o=r-a.waterLevel,s=a.slopeAt(t,n);return i.copy(kr),i.lerp(Ar,A(.7,2.4,o)),i.lerp(jr,A(.35,.6,o/a.relief)),i.lerp(Mr,A(.16,.34,s)),i}function Fr(e,t){let n=e.getAttribute(`position`),r=e.getIndex(),i=[];for(let e=0;r&&e<r.count;e+=6){let a=Array.from({length:6},(t,n)=>r.getX(e+n));a.some(e=>n.getY(e)>t)&&i.push(...a)}return i}function Ir(t){let n=null,r=null;return{name:`terrain`,build({scene:i}){let{ground:a}=t,o=Or[t.quality.tier],s=new e.PlaneGeometry(a.size,a.size,o,o);s.rotateX(-Math.PI/2);let c=s.getAttribute(`position`),l=new Float32Array(c.count*3);for(let e=0;e<c.count;e+=1){let n=c.getX(e),r=c.getZ(e),i=a.heightAt(n,r);c.setY(e,i),Pr(t,n,r,i,Nr).toArray(l,e*3)}s.setAttribute(`color`,new e.BufferAttribute(l,3)),s.setIndex(Fr(s,a.waterLevel-5)),s.computeVertexNormals(),s.computeBoundingBox(),s.computeBoundingSphere();let u=new e.MeshStandardMaterial({name:`terrain`,vertexColors:!0,flatShading:!0,roughness:.96,metalness:0});r=Er(t.path,t.quality.tier),Dr(u,r),B(u,t),n=new e.Mesh(s,u),n.name=`terrain`,n.castShadow=!0,n.receiveShadow=!0,i.add(n)},dispose(){n?.geometry.dispose(),n?.material instanceof e.Material&&n.material.dispose(),r?.texture.dispose(),n?.removeFromParent(),n=null,r=null}}}var Lr={mobile:900,desktop:2600,highEnd:4200},Rr=1.9,Z=.8,zr=`
  #ifdef USE_INSTANCING
    mat3 tuft = mat3(instanceMatrix);
    vec2 root = instanceMatrix[3].xz;
    vec3 lee  = (vec3(WIND.x, 0.0, WIND.y) * tuft) / vec3(dot(tuft[0], tuft[0]), dot(tuft[1], tuft[1]), dot(tuft[2], tuft[2]));

    float gust   = windGust(root);
    float shiver = sin(dot(windFrame(root), vec2(149.0, -113.0)));
    float lean   = 0.16 + 0.5 * gust + 0.08 * shiver * (0.4 + 0.6 * gust);
    float up     = clamp(transformed.y / ${Z}, 0.0, 1.0);

    transformed   += lee * (lean * up * up * ${Z} * length(tuft[1]));
    transformed.y -= lean * lean * up * up * ${Z*.35};
  #endif
`,Q=new e.Object3D,Br=new e.Color;function Vr(){let t=[-.45,0,.45].map((t,n)=>{let r=new e.ConeGeometry(.09,Z,3,1,!0);return r.translate(0,Z/2,0),r.rotateZ(t),r.rotateY(n*2.1),r}),n=re(t);for(let e of t)e.dispose();let r=n.getAttribute(`normal`);for(let e=0;e<r.count;e+=1)r.setXYZ(e,0,1,0);return n.computeBoundingBox(),n.computeBoundingSphere(),n}function Hr(e,t){pe(e,`tuft-sway`,e=>{Object.assign(e.uniforms,t.uniforms),e.vertexShader=F(F(e.vertexShader,`#include <common>`,R),`#include <begin_vertex>`,zr)})}function Ur(t){let n=null;return{name:`tufts`,build({scene:r,rng:i}){let{ground:a}=t,o=i.fork(`tufts:place`),s=oe(i.fork(`tufts:patches`).int(1,1e6)),c=lr({ground:a,rng:o,count:Lr[t.quality.tier],accept(e){let t=e.height-a.waterLevel;return t>1.1&&t<a.relief*.5&&e.slope<.2&&s.fbm(e.x*.03,9.1,e.z*.03,2)>-.08}}),l=Vr(),u=new e.MeshStandardMaterial({name:`tuft`,roughness:1,metalness:0,side:e.DoubleSide});Hr(u,t.wind),B(u,t),n=new e.InstancedMesh(l,u,c.length),n.name=`tufts`,n.receiveShadow=!0;let d=0;for(let e of c){let r=o.range(.7,1.7);Q.position.set(e.x,e.height-.05,e.z),Q.rotation.set(0,o.range(0,Math.PI*2),0),Q.scale.set(r,r*o.range(.8,1.4),r),Q.updateMatrix(),Br.set(o.next()<.3?q.grassDry:q.grass).offsetHSL(0,0,o.range(-.05,.08)),t.path.distanceTo(e.x,e.z)<Rr||(n.setMatrixAt(d,Q.matrix),n.setColorAt(d,Br),d+=1)}n.count=d,Nn(n),r.add(n)},dispose(){K(n),n=null}}}var Wr=11,Gr=15,Kr=9,qr=2.7,Jr=4,Yr=1.15,Xr=.55,Zr=2.5,Qr=5.5,$r=1.5,ei=(Math.floor(12/$r)+1)*2+2,$=new e.Object3D,ti=new e.Color;function ni(e,t){$.updateMatrix(),e.mesh.setMatrixAt(e.laid,$.matrix),e.mesh.setColorAt(e.laid,ti.set(q.cairn).offsetHSL(0,0,t)),e.laid+=1}function ri(t,{x:n,z:r}){let{ground:i,lay:a}=t,o=i.heightAt(n,r)-.2;for(let i=0;i<Jr;i+=1){let s=e.MathUtils.lerp(Yr,Xr,i/3),c=s*a.range(.42,.55),l=s*.14;$.position.set(n+a.range(-l,l),o+c*.6,r+a.range(-l,l)),$.rotation.set(a.range(-.08,.08),a.range(0,Math.PI*2),a.range(-.08,.08)),$.scale.set(s,c,s*a.range(.85,1.05)),ni(t,a.range(-.05,.05)),o+=c*1.05}$.position.set(n,o+.46,r),$.rotation.set(.06,a.range(0,Math.PI*2),-.05),$.scale.set(.33,1.05,.26),ni(t,.04)}function ii(e,t,n){let{x:r,z:i,ahead:a}=e.at(n),o={x:r-a[1]*qr,z:i+a[0]*qr},s={x:r+a[1]*qr,z:i-a[0]*qr},c=e.distanceTo(o.x,o.z)-e.distanceTo(s.x,s.z);return Math.abs(c)>.3?c>0?o:s:t.heightAt(o.x,o.z)<t.heightAt(s.x,s.z)?o:s}function ai(e,t){let{ground:n,lay:r}=e,{x:i,z:a,seaward:[o,s]}=t.landing;for(let t of[-1,1]){for(let c=-6.5;c<=Qr;c+=$r){let l=t*(Zr+r.range(-.2,.2)),u=c+r.range(-.25,.25),d=r.range(.55,.95),f=i+o*u-s*l,p=a+s*u+o*l;$.position.set(f,Math.max(n.heightAt(f,p),n.waterLevel-d*.35)+d*.12,p),$.rotation.set(r.range(-.25,.25),r.range(0,Math.PI*2),r.range(-.25,.25)),$.scale.set(d,d*r.range(.7,.95),d*r.range(.85,1.15)),ni(e,r.range(-.08,.03))}let c=i-o*7.9-s*t*Zr,l=a-s*7.9+o*t*Zr;$.position.set(c,n.heightAt(c,l)+1.1,l),$.rotation.set(r.range(-.07,.07),r.range(0,Math.PI*2),r.range(-.07,.07)),$.scale.set(.6,2.1,.46),ni(e,.03)}}function oi(t){let n=null;return{name:`waymarks`,build({scene:r,rng:i}){let{ground:a,path:o}=t,s=[];for(let e=Wr;e<o.length-Kr;e+=Gr)s.push(e);let c=Pn(i.fork(`waymarks:shape`).int(1,1e6)),l=new e.MeshStandardMaterial({name:`waymark`,flatShading:!0,roughness:1,metalness:0});B(l,t),n=new e.InstancedMesh(c,l,s.length*5+ei),n.name=`waymarks`,n.castShadow=!0,n.receiveShadow=!0;let u={mesh:n,laid:0,ground:a,lay:i.fork(`waymarks:lay`)};for(let e of s)ri(u,ii(o,a,e));ai(u,o),n.count=u.laid,Nn(n),r.add(n)},dispose(){K(n),n=null}}}function si(t,n){let r=n+1,i=t.size/n,a=t.size/2,o=new Uint16Array(r*r);for(let n=0;n<r;n+=1)for(let s=0;s<r;s+=1){let c=t.heightAt(s*i-a,n*i-a);o[n*r+s]=e.DataUtils.toHalfFloat(c-t.waterLevel)}let s=new e.DataTexture(o,r,r,e.RedFormat,e.HalfFloatType);return s.name=`height-map`,s.magFilter=e.LinearFilter,s.minFilter=e.LinearFilter,s.needsUpdate=!0,{texture:s,scale:n/(r*t.size)}}var ci=3200,li=`
  ${R}
  ${De}

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
`,ui=`
  ${R}
  ${De}

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
`;function di(t){let n=null,r=null,i=null;return{name:`water`,build({scene:a}){let o=si(t.ground,Or[t.quality.tier]);i=o.texture,r=new e.ShaderMaterial({name:`water`,vertexShader:li,fragmentShader:ui,transparent:!0,fog:!0,uniforms:{...e.UniformsUtils.clone(e.UniformsLib.fog),...t.wind.uniforms,...t.clouds.uniforms,uTime:{value:0},uDeep:{value:new e.Color(q.waterDeep)},uShallow:{value:new e.Color(q.waterShallow)},uSky:{value:new e.Color(q.skyFill)},uFoam:{value:new e.Color(q.foam)},uSun:{value:new e.Color(q.sun)},uSunDirection:{value:I.clone()},uGround:{value:i},uGroundScale:{value:o.scale}}});let s=new e.PlaneGeometry(ci,ci);s.rotateX(-Math.PI/2),n=new e.Mesh(s,r),n.name=`water`,n.position.y=t.ground.waterLevel,a.add(n)},update(e,t){r&&(r.uniforms.uTime.value=t.frame*W)},dispose(){n?.geometry.dispose(),r?.dispose(),i?.dispose(),n?.removeFromParent(),n=null,r=null,i=null}}}function fi(e){return[sr(e),tr(e),Ir(e),di(e),mr(e),Ur(e),Bn(e),oi(e)]}var pi={harness:null};function mi(){let e=document.querySelector(`canvas`);if(!e)throw Error(`index.html has no canvas`);let t=dt(window.location.search),n=le(t.tier??(t.harness?`desktop`:ce())),r=ot({seed:t.seed,quality:n}),i=wn({world:r,canvas:e,stick:document.querySelector(`scenery-stick`),interactive:!t.harness,onMove(){o.getState().explore||o.setState({explore:!0})}}),a={hold:!1,frame:0,paint:()=>o.ctx.renderer.render(o.ctx.scene,o.ctx.camera)},o=N({canvas:e,state:{explore:!1},seed:t.seed,clock:S({mode:`fixed`,step:W}),renderer:{shadows:!1,pixelRatioMax:t.harness?1:n.pixelRatio},camera:{fov:55,near:.5,far:3e3},background:q.horizon,lighting:!1,orbit:!1,modules:[...fi(r),i.module],onFrame(e,t){a.frame=t.frame},render(){a.hold||a.paint()}});pi.harness=lt({app:o,rig:i,painter:a,canvas:e,capturing:t.harness}),An(e),jn(o),o.tick(W),t.harness||o.start(),Dn(`ready`),pi.harness.ready()}try{mi()}catch(e){Dn(`failed`),Mn(`This world could not start on this device.`),pi.harness?.fail(e),console.error(e)}