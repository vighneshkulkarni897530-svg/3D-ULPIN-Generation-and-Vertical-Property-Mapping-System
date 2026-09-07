'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

interface Earth3DBackgroundProps {
  className?: string;
  speed?: number;
  glowColor?: string;
  showRings?: boolean;
  showStars?: boolean;
}

export const Earth3DBackground: React.FC<Earth3DBackgroundProps> = ({
  className,
  speed = 0.004,
  glowColor = '#38bdf8',
  showRings = true,
  showStars = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 10;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 3. Earth Group with Planetary Tilt (~15 deg)
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -0.22;
    earthGroup.rotation.x = 0.08;
    scene.add(earthGroup);

    // 4. Texture Loader for Earth Image
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      '/images/earth-globe.jpg',
      () => setLoaded(true),
      undefined,
      (err) => console.warn('Could not load earth texture:', err)
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    // 5. 3D Earth Sphere Mesh
    const sphereRadius = width < 640 ? 2.6 : 3.4;
    const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.6,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 6. Atmospheric Halo Outer Layer
    const atmosphereGeometry = new THREE.SphereGeometry(sphereRadius * 1.035, 48, 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(glowColor),
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // 7. Geospatial Orbital Ring
    let orbitalRing: THREE.Mesh | null = null;
    let outerDottedRing: THREE.Mesh | null = null;
    if (showRings) {
      const ringGeometry = new THREE.RingGeometry(sphereRadius * 1.25, sphereRadius * 1.27, 80);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#06b6d4'),
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });
      orbitalRing = new THREE.Mesh(ringGeometry, ringMaterial);
      orbitalRing.rotation.x = Math.PI / 2;
      earthGroup.add(orbitalRing);

      const outerRingGeometry = new THREE.RingGeometry(sphereRadius * 1.45, sphereRadius * 1.465, 80);
      const outerRingMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#38bdf8'),
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
      });
      outerDottedRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
      outerDottedRing.rotation.x = Math.PI / 2 + 0.1;
      earthGroup.add(outerDottedRing);
    }

    // 8. Cosmic Background Starfield
    let starPoints: THREE.Points | null = null;
    if (showStars) {
      const starCount = 450;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 60;
        starPositions[i + 1] = (Math.random() - 0.5) * 60;
        starPositions[i + 2] = (Math.random() - 0.5) * 40 - 15;
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0xe0f2fe,
        size: 0.12,
        transparent: true,
        opacity: 0.6,
      });
      starPoints = new THREE.Points(starGeometry, starMaterial);
      scene.add(starPoints);
    }

    // 9. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 3.2);
    sunLight.position.set(8, 4, 7);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 1.6);
    rimLight.position.set(-8, -3, -5);
    scene.add(rimLight);

    // 10. Mouse Interactivity / Parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 11. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    // 12. Main 60fps Animation Loop (Y-Axis Spin)
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Continuous 3D rotation on Y-axis
      earthMesh.rotation.y += speed;

      if (orbitalRing) {
        orbitalRing.rotation.z -= speed * 0.7;
      }
      if (outerDottedRing) {
        outerDottedRing.rotation.z += speed * 0.5;
      }

      // Smooth mouse parallax damping
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      earthGroup.position.x = currentMouseX * 0.4;
      earthGroup.position.y = -currentMouseY * 0.3;

      if (starPoints) {
        starPoints.rotation.y += speed * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 13. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      earthTexture.dispose();
      renderer.dispose();
    };
  }, [speed, glowColor, showRings, showStars]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        'fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-slate-950/95',
        className
      )}
    >
      {/* Ambient Cosmic Background Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[300px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
    </div>
  );
};
