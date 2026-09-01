(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,73447,e=>{"use strict";let t,i;var n=e.i(43476),r=e.i(71645),o=e.i(90072),a=e.i(75056),s=e.i(48546),l=e.i(94800),d=e.i(30297),c=e.i(31067),u=o,f=o;let p=new f.Box3,h=new f.Vector3;class m extends f.InstancedBufferGeometry{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new f.Float32BufferAttribute([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new f.Float32BufferAttribute([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,i=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),i.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let i=new f.InstancedInterleavedBuffer(t,6,1);return this.setAttribute("instanceStart",new f.InterleavedBufferAttribute(i,3,0)),this.setAttribute("instanceEnd",new f.InterleavedBufferAttribute(i,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let i;e instanceof Float32Array?i=e:Array.isArray(e)&&(i=new Float32Array(e));let n=new f.InstancedInterleavedBuffer(i,2*t,1);return this.setAttribute("instanceColorStart",new f.InterleavedBufferAttribute(n,t,0)),this.setAttribute("instanceColorEnd",new f.InterleavedBufferAttribute(n,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new f.WireframeGeometry(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new f.Box3);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),p.setFromBufferAttribute(t),this.boundingBox.union(p))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new f.Sphere),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let i=this.boundingSphere.center;this.boundingBox.getCenter(i);let n=0;for(let r=0,o=e.count;r<o;r++)h.fromBufferAttribute(e,r),n=Math.max(n,i.distanceToSquared(h)),h.fromBufferAttribute(t,r),n=Math.max(n,i.distanceToSquared(h));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var g=o,v=e.i(8560);let y=parseInt(o.REVISION.replace(/\D+/g,""));class x extends g.ShaderMaterial{constructor(e){super({type:"LineMaterial",uniforms:g.UniformsUtils.clone(g.UniformsUtils.merge([v.UniformsLib.common,v.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new g.Vector2(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${y>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let S=y>=125?"uv1":"uv2",w=new u.Vector4,b=new u.Vector3,L=new u.Vector3,E=new u.Vector4,_=new u.Vector4,A=new u.Vector4,z=new u.Vector3,B=new u.Matrix4,U=new u.Line3,M=new u.Vector3,j=new u.Box3,C=new u.Sphere,O=new u.Vector4;function I(e,t,n){return O.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),O.multiplyScalar(1/O.w),O.x=i/n.width,O.y=i/n.height,O.applyMatrix4(e.projectionMatrixInverse),O.multiplyScalar(1/O.w),Math.abs(Math.max(O.x,O.y))}class P extends u.Mesh{constructor(e=new m,t=new x({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,i=e.attributes.instanceEnd,n=new Float32Array(2*t.count);for(let e=0,r=0,o=t.count;e<o;e++,r+=2)b.fromBufferAttribute(t,e),L.fromBufferAttribute(i,e),n[r]=0===r?0:n[r-1],n[r+1]=n[r]+b.distanceTo(L);let r=new u.InstancedInterleavedBuffer(n,2,1);return e.setAttribute("instanceDistanceStart",new u.InterleavedBufferAttribute(r,1,0)),e.setAttribute("instanceDistanceEnd",new u.InterleavedBufferAttribute(r,1,1)),this}raycast(e,n){let r,o,a=this.material.worldUnits,s=e.camera;null!==s||a||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let l=void 0!==e.params.Line2&&e.params.Line2.threshold||0;t=e.ray;let d=this.matrixWorld,c=this.geometry,f=this.material;if(i=f.linewidth+l,null===c.boundingSphere&&c.computeBoundingSphere(),C.copy(c.boundingSphere).applyMatrix4(d),a)r=.5*i;else{let e=Math.max(s.near,C.distanceToPoint(t.origin));r=I(s,e,f.resolution)}if(C.radius+=r,!1!==t.intersectsSphere(C)){if(null===c.boundingBox&&c.computeBoundingBox(),j.copy(c.boundingBox).applyMatrix4(d),a)o=.5*i;else{let e=Math.max(s.near,j.distanceToPoint(t.origin));o=I(s,e,f.resolution)}j.expandByScalar(o),!1!==t.intersectsBox(j)&&(a?function(e,n){let r=e.matrixWorld,o=e.geometry,a=o.attributes.instanceStart,s=o.attributes.instanceEnd,l=Math.min(o.instanceCount,a.count);for(let o=0;o<l;o++){U.start.fromBufferAttribute(a,o),U.end.fromBufferAttribute(s,o),U.applyMatrix4(r);let l=new u.Vector3,d=new u.Vector3;t.distanceSqToSegment(U.start,U.end,d,l),d.distanceTo(l)<.5*i&&n.push({point:d,pointOnLine:l,distance:t.origin.distanceTo(d),object:e,face:null,faceIndex:o,uv:null,[S]:null})}}(this,n):function(e,n,r){let o=n.projectionMatrix,a=e.material.resolution,s=e.matrixWorld,l=e.geometry,d=l.attributes.instanceStart,c=l.attributes.instanceEnd,f=Math.min(l.instanceCount,d.count),p=-n.near;t.at(1,A),A.w=1,A.applyMatrix4(n.matrixWorldInverse),A.applyMatrix4(o),A.multiplyScalar(1/A.w),A.x*=a.x/2,A.y*=a.y/2,A.z=0,z.copy(A),B.multiplyMatrices(n.matrixWorldInverse,s);for(let n=0;n<f;n++){if(E.fromBufferAttribute(d,n),_.fromBufferAttribute(c,n),E.w=1,_.w=1,E.applyMatrix4(B),_.applyMatrix4(B),E.z>p&&_.z>p)continue;if(E.z>p){let e=E.z-_.z,t=(E.z-p)/e;E.lerp(_,t)}else if(_.z>p){let e=_.z-E.z,t=(_.z-p)/e;_.lerp(E,t)}E.applyMatrix4(o),_.applyMatrix4(o),E.multiplyScalar(1/E.w),_.multiplyScalar(1/_.w),E.x*=a.x/2,E.y*=a.y/2,_.x*=a.x/2,_.y*=a.y/2,U.start.copy(E),U.start.z=0,U.end.copy(_),U.end.z=0;let l=U.closestPointToPointParameter(z,!0);U.at(l,M);let f=u.MathUtils.lerp(E.z,_.z,l),h=f>=-1&&f<=1,m=z.distanceTo(M)<.5*i;if(h&&m){U.start.fromBufferAttribute(d,n),U.end.fromBufferAttribute(c,n),U.start.applyMatrix4(s),U.end.applyMatrix4(s);let i=new u.Vector3,o=new u.Vector3;t.distanceSqToSegment(U.start,U.end,o,i),r.push({point:o,pointOnLine:i,distance:t.origin.distanceTo(o),object:e,face:null,faceIndex:n,uv:null,[S]:null})}}}(this,s,n))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(w),this.material.uniforms.resolution.value.set(w.z,w.w))}}class D extends m{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,i=new Float32Array(2*t);for(let n=0;n<t;n+=3)i[2*n]=e[n],i[2*n+1]=e[n+1],i[2*n+2]=e[n+2],i[2*n+3]=e[n+3],i[2*n+4]=e[n+4],i[2*n+5]=e[n+5];return super.setPositions(i),this}setColors(e,t=3){let i=e.length-t,n=new Float32Array(2*i);if(3===t)for(let r=0;r<i;r+=t)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];else for(let r=0;r<i;r+=t)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5],n[2*r+6]=e[r+6],n[2*r+7]=e[r+7];return super.setColors(n,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class T extends P{constructor(e=new D,t=new x({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let R=r.forwardRef(function({points:e,color:t=0xffffff,vertexColors:i,linewidth:n,lineWidth:a,segments:l,dashed:d,...u},f){var p,h;let g=(0,s.useThree)(e=>e.size),v=r.useMemo(()=>l?new P:new T,[l]),[y]=r.useState(()=>new x),S=(null==i||null==(p=i[0])?void 0:p.length)===4?4:3,w=r.useMemo(()=>{let n=l?new m:new D,r=e.map(e=>{let t=Array.isArray(e);return e instanceof o.Vector3||e instanceof o.Vector4?[e.x,e.y,e.z]:e instanceof o.Vector2?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(n.setPositions(r.flat()),i){t=0xffffff;let e=i.map(e=>e instanceof o.Color?e.toArray():e);n.setColors(e.flat(),S)}return n},[e,l,i,S]);return r.useLayoutEffect(()=>{v.computeLineDistances()},[e,v]),r.useLayoutEffect(()=>{d?y.defines.USE_DASH="":delete y.defines.USE_DASH,y.needsUpdate=!0},[d,y]),r.useEffect(()=>()=>{w.dispose(),y.dispose()},[w]),r.createElement("primitive",(0,c.default)({object:v,ref:f},u),r.createElement("primitive",{object:w,attach:"geometry"}),r.createElement("primitive",(0,c.default)({object:y,attach:"material",color:t,vertexColors:!!i,resolution:[g.width,g.height],linewidth:null!=(h=null!=n?n:a)?h:1,dashed:d,transparent:4===S},u)))});var V=e.i(9679),F=e.i(29678);function H(e,t,i){let n=(0,V.ringBounds)(e),r=(0,V.ringWidthMeters)(e,t),o=(0,V.ringDepthMeters)(e),a=(0,V.geoToLocal)(i.lat,i.lng,(n.minLat+n.maxLat)/2,(n.minLng+n.maxLng)/2);return{w:r,d:o,cx:a.x,cz:a.z}}function G({result:e,origin:t}){let i=r.useMemo(()=>{let t=(0,V.lngLatRing)(e.extractedFootprint).map(([t,i])=>{let n=(0,V.geoToLocal)(e.centroid.lat,e.centroid.lng,i,t);return new o.Vector2(n.x,n.z)}),i=new o.Box2().setFromPoints(t).getCenter(new o.Vector2),n=e.estimatedHeightMeters,r=new o.Shape(t.map(e=>new o.Vector2(e.x-i.x,e.y-i.y))),a=new o.ExtrudeGeometry(r,{depth:n,bevelEnabled:!1});return a.rotateX(-Math.PI/2),{geo:a,edges:new o.EdgesGeometry(a)}},[e]),a=(0,V.geoToLocal)(t.lat,t.lng,e.centroid.lat,e.centroid.lng);return(0,n.jsxs)("group",{position:[a.x,0,a.z],children:[(0,n.jsx)("mesh",{geometry:i.geo,children:(0,n.jsx)("meshStandardMaterial",{color:"#06B6D4",transparent:!0,opacity:.2,depthWrite:!1})}),(0,n.jsx)("lineSegments",{geometry:i.edges,children:(0,n.jsx)("lineBasicMaterial",{color:"#06B6D4"})}),(0,n.jsxs)("mesh",{position:[0,e.estimatedHeightMeters+1.2,0],children:[(0,n.jsx)("sphereGeometry",{args:[.8,16,16]}),(0,n.jsx)("meshBasicMaterial",{color:"#F59E0B"})]})]})}function N({parcels:e,origin:t,layers:i,selectedParcelId:r,onSelectParcel:o}){return i.parcels?(0,n.jsx)("group",{children:e.map(e=>{let i=(0,V.lngLatRing)(e.geometry).map(([e,i])=>{let n=(0,V.geoToLocal)(t.lat,t.lng,i,e);return[n.x,.02,n.z]}),a=r===e.id,s=F.PARCEL_COLORS[e.status]??F.PARCEL_COLORS.default,l=a?"#06B6D4":s.stroke;return(0,n.jsxs)("group",{children:[(0,n.jsxs)("mesh",{position:[(i[0][0]+i[2][0])/2,0,(i[0][2]+i[2][2])/2],rotation:[-Math.PI/2,0,0],onClick:t=>{t.stopPropagation(),o(a?r:e.id)},children:[(0,n.jsx)("planeGeometry",{args:[Math.abs(i[2][0]-i[0][0]),Math.abs(i[2][2]-i[0][2])]}),(0,n.jsx)("meshStandardMaterial",{color:a?"#0891B2":s.stroke,transparent:!0,opacity:a?.22:.12,depthWrite:!1})]}),(0,n.jsx)(R,{points:i,color:l,lineWidth:2.2})]},e.id)})}):null}function W({buildings:e,floors:t,origin:i,layers:r,selectedParcelId:o,selectedBuildingId:a,selectedFloorId:s,onSelectBuilding:l,onSelectFloor:d}){return r.buildings?(0,n.jsx)("group",{children:e.map(e=>{let{w:r,d:c,cx:u,cz:f}=H((0,V.lngLatRing)(e.geometry),i.lat,i),p=a===e.id,h=!!o&&e.parcelId===o,m=t.filter(t=>t.buildingId===e.id);return(0,n.jsxs)("group",{children:[(0,n.jsxs)("mesh",{position:[u,e.height/2,f],onClick:t=>{t.stopPropagation(),l(p?a:e.id)},children:[(0,n.jsx)("boxGeometry",{args:[r,e.height,c]}),(0,n.jsx)("meshStandardMaterial",{color:p?"#22D3EE":h?"#3B82F6":"#334155",transparent:!0,opacity:p?.85:.55,roughness:.75})]}),m.map(t=>{let i=s===t.id;return(0,n.jsxs)("mesh",{position:[u,t.elevation+.2,f],onClick:n=>{n.stopPropagation(),p||l(e.id),d(i?"":t.id)},children:[(0,n.jsx)("boxGeometry",{args:[1.01*r,.5,1.01*c]}),(0,n.jsx)("meshStandardMaterial",{color:i?"#22D3EE":"#0E7490",emissive:i?"#06B6D4":"#000000",emissiveIntensity:.9*!!i,transparent:!0,opacity:i?1:.55})]},t.id)}),p&&(0,n.jsx)(R,{points:[[u-r/2,.05,f-c/2],[u+r/2,.05,f-c/2],[u+r/2,.05,f+c/2],[u-r/2,.05,f+c/2],[u-r/2,.05,f-c/2]],color:"#FFFFFF",lineWidth:1.5})]},e.id)})}):null}function k({properties:e,origin:t,layers:i,selectedBuildingId:r,selectedFloorId:o,selectedPropertyId:a,onSelectProperty:s}){return i.units||i.boundaries?(0,n.jsx)("group",{children:e.map(e=>{let l=a===e.id;if(o&&e.floorId!==o&&!l)return null;let d=!o&&!!r&&e.buildingId!==r,c=F.UNIT_COLORS[e.verificationStatus]??F.UNIT_COLORS.default,u=(0,V.geoToLocal)(t.lat,t.lng,e.latitude,e.longitude),f=e.elevation+.9;return(0,n.jsxs)("group",{children:[i.units&&(0,n.jsxs)("mesh",{position:[u.x,f,u.z],onClick:t=>{t.stopPropagation(),s(l?"":e.id)},children:[(0,n.jsx)("boxGeometry",{args:[l?2.6:1.8,1.3,l?2.6:1.8]}),(0,n.jsx)("meshStandardMaterial",{color:l?"#F8FAFC":c.fill,emissive:l?"#06B6D4":"#000000",emissiveIntensity:.85*!!l,transparent:!0,opacity:d?.22:.95,roughness:.5})]}),i.boundaries&&(0,n.jsx)(R,{points:[[u.x-5,f-.7,u.z-5],[u.x+5,f-.7,u.z-5],[u.x+5,f-.7,u.z+5],[u.x-5,f-.7,u.z+5],[u.x-5,f-.7,u.z-5]],color:l?"#22D3EE":c.stroke,lineWidth:l?2:1,transparent:!0,opacity:d?.25:.85})]},e.id)})}):null}function q({conflicts:e,origin:t}){return(0,n.jsx)("group",{children:e.map(e=>{let i=F.CONFLICT_COLORS[e.severity]??F.CONFLICT_COLORS.default,r="Resolved"===e.status,a=(0,V.lngLatRing)(e.geometry).map(([e,i])=>{let n=(0,V.geoToLocal)(t.lat,t.lng,i,e);return new o.Vector2(n.x,-n.z)}),s=new o.Shape(a);return(0,n.jsxs)("group",{children:[(0,n.jsxs)("mesh",{position:[0,.45,0],rotation:[-Math.PI/2,0,0],children:[(0,n.jsx)("shapeGeometry",{args:[s]}),(0,n.jsx)("meshStandardMaterial",{color:i.stroke,transparent:!0,opacity:r?.14:.42,side:o.DoubleSide,depthWrite:!1})]}),(0,n.jsx)(R,{points:a.map(e=>[e.x,.5,-e.y]),color:i.stroke,lineWidth:1.8,transparent:!0,opacity:r?.35:.9})]},e.id)})})}function K({controlsRef:e,target:t}){let{camera:i}=(0,s.useThree)(),n=r.useRef(new o.Vector3(t[0],t[1],t[2]));return r.useEffect(()=>{n.current.set(t[0],t[1],t[2])},[t]),(0,l.useFrame)(()=>{let t=e.current;if(!t?.target)return;let r=new o.Vector3().subVectors(n.current,t.target).multiplyScalar(.09);4e-4>r.lengthSq()||(t.target.add(r),i.position.add(r),t.update())}),null}e.s(["GisViewer3D",0,function({parcels:e,buildings:t,floors:i,properties:o,conflicts:s,layers:l,selectedParcelId:c,selectedBuildingId:u,selectedFloorId:f,selectedPropertyId:p,selectedConflictId:h,prototypeExtraction:m,onSelectParcel:g,onSelectBuilding:v,onSelectFloor:y,onSelectProperty:x,className:S}){let w=r.useMemo(()=>{var t;return(t=e).length?{lat:t.reduce((e,t)=>e+t.centroid.lat,0)/t.length,lng:t.reduce((e,t)=>e+t.centroid.lng,0)/t.length}:{lat:18.56,lng:73.78}},[e]),b=r.useRef(null),L=r.useMemo(()=>{let i=s.find(e=>e.id===h);if(i){let e=o.find(e=>e.id===i.affectedPropertyIds[0]);if(e){let t=(0,V.geoToLocal)(w.lat,w.lng,e.latitude,e.longitude);return[t.x,e.elevation+1,t.z]}let t=(0,V.ringBounds)((0,V.lngLatRing)(i.geometry)),n=(0,V.geoToLocal)(w.lat,w.lng,(t.minLat+t.maxLat)/2,(t.minLng+t.maxLng)/2);return[n.x,0,n.z]}let n=o.find(e=>e.id===p);if(n){let e=(0,V.geoToLocal)(w.lat,w.lng,n.latitude,n.longitude);return[e.x,n.elevation+1,e.z]}let r=t.find(e=>e.id===u);if(r){let e=H((0,V.lngLatRing)(r.geometry),w.lat,w);return[e.cx,r.height/2,e.cz]}let a=e.find(e=>e.id===c);if(a){let e=(0,V.geoToLocal)(w.lat,w.lng,a.centroid.lat,a.centroid.lng);return[e.x,0,e.z]}return[0,0,0]},[h,p,u,c,o,t,e,s,w]);return(0,n.jsxs)(a.Canvas,{camera:{position:[0,90,-80],fov:45,near:.1,far:1e3},dpr:[1,2],className:S,children:[(0,n.jsx)("ambientLight",{intensity:.7}),(0,n.jsx)("directionalLight",{position:[60,120,40],intensity:1.1}),(0,n.jsx)("pointLight",{position:[0,120,0],intensity:.4}),(0,n.jsx)("gridHelper",{args:[240,24,"#2b4a6f","#1E293B"],position:[0,0,0]}),(0,n.jsx)(N,{parcels:e,origin:w,layers:l,selectedParcelId:c,onSelectParcel:g}),(0,n.jsx)(W,{buildings:t,floors:i,origin:w,layers:l,selectedParcelId:c,selectedBuildingId:u,selectedFloorId:f,onSelectBuilding:v,onSelectFloor:y}),(0,n.jsx)(k,{properties:o,origin:w,layers:l,selectedBuildingId:u,selectedFloorId:f,selectedPropertyId:p,onSelectProperty:x}),l.conflicts&&s.length>0&&(0,n.jsx)(q,{conflicts:s,origin:w}),m&&(0,n.jsx)(G,{result:m,origin:w}),(0,n.jsx)(d.OrbitControls,{ref:b,makeDefault:!0,enablePan:!0,maxPolarAngle:Math.PI/2.1}),(0,n.jsx)(K,{controlsRef:b,target:L})]})}],73447)},60909,function(e){e.n(e.i(73447))}]);