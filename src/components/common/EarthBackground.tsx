'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface EarthBackgroundProps {
  children?: React.ReactNode;
  earthSize?: number;
  className?: string;
  opacity?: number;
  interactive?: boolean;
}

/**
 * Full-screen animated 3D Earth background with stars, atmosphere and cinematic lighting.
 * No external image/texture assets required — generated procedurally via Canvas & Three.js.
 */
export default function EarthBackground({
  children,
  earthSize = 3.25,
  className = '',
  opacity = 1,
}: EarthBackgroundProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020711);

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Soft cinematic lighting
    scene.add(new THREE.AmbientLight(0x4169a1, 1.25));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-5, 3, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x1fbfb8, 1.5);
    rimLight.position.set(5, -2, -4);
    scene.add(rimLight);

    // Procedural Earth canvas texture
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024;
    textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d');

    if (ctx) {
      const ocean = ctx.createLinearGradient(0, 0, 0, 512);
      ocean.addColorStop(0, '#071d46');
      ocean.addColorStop(0.5, '#063a72');
      ocean.addColorStop(1, '#02152f');
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, 1024, 512);

      let seed = 26011;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      ctx.fillStyle = '#2f8067';
      for (let i = 0; i < 42; i += 1) {
        const x = random() * 1024;
        const y = 90 + random() * 310;
        const rx = 18 + random() * 80;
        const ry = 10 + random() * 55;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#8fbd75';
      for (let i = 0; i < 80; i += 1) {
        const x = random() * 1024;
        const y = 105 + random() * 290;
        const r = 2 + random() * 11;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(235,248,255,0.92)';
      ctx.fillRect(0, 0, 1024, 18);
      ctx.fillRect(0, 494, 1024, 18);

      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 24; i += 1) {
        ctx.beginPath();
        const y = 45 + random() * 410;
        ctx.moveTo(random() * 250, y);
        ctx.bezierCurveTo(350, y - 15, 650, y + 18, 1024, y - 5);
        ctx.stroke();
      }
    }

    const earthTexture = new THREE.CanvasTexture(textureCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const earthGeometry = new THREE.SphereGeometry(earthSize, 96, 96);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 16,
      specular: new THREE.Color(0x1fbfb8),
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.rotation.z = THREE.MathUtils.degToRad(-18);
    scene.add(earth);

    // Atmospheric halo
    const atmosphereGeometry = new THREE.SphereGeometry(earthSize * 1.045, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x1fbfb8,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i += 1) {
      const radius = 18 + Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xb9d8ff,
      size: 0.035,
      transparent: true,
      opacity: 0.72,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth || window.innerWidth;
      const newHeight = mount.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      earth.rotation.y += 0.0018;
      atmosphere.rotation.y += 0.0018;
      stars.rotation.y -= 0.00005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      earthTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [mounted, earthSize]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#020711] ${className}`}
      style={{ minHeight: '100vh' }}
    >
      <div
        ref={mountRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{ opacity }}
      />
      {children && (
        <div className="relative z-10 w-full min-h-full bg-transparent">
          {children}
        </div>
      )}
    </div>
  );
}
