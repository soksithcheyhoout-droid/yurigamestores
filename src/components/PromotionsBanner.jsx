import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Flame,
  ChevronDown,
  Gift,
  Box,
  Layers
} from 'lucide-react';
import { GAMES, findAuthorizedGame } from '../data/games';
import { scrollToTarget } from '../hooks/useLenisSmoothScroll';

gsap.registerPlugin(ScrollTrigger);

// Direct Open-Source GitHub Raw URL & Local Fallback for 3D Game Diamond Asset
const GITHUB_RAW_DIAMOND_URL = 'https://raw.githubusercontent.com/drcmda/the-substance/master/public/diamond.glb';
const LOCAL_DIAMOND_URL = '/assets/models/diamond.glb';

export default function PromotionsBanner({ onSelectGame }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrubProgress, setScrubProgress] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const cardRefs = useRef([]);
  const stRef = useRef(null);

  // Curated 4 Authorized Top-Up Products with rich metadata and gaming hex colors
  const deals = useMemo(() => [
    {
      id: 'ml',
      gameTitle: 'Mobile Legends: Bang Bang',
      dealName: 'Weekly Diamond Pass',
      tagline: 'Moonton Direct Server Sync',
      badge: 'SAVE 60%',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
      accentColor: '#3b82f6',
      accentGradient: 'from-blue-600 via-cyan-500 to-teal-400',
      threeColor: 0x3b82f6,
      desc: 'Instant 210 Diamonds + 70 Starlight Points delivered directly to your Moonton Server ID with 0% Bakong KHQR fee.',
      price: '$1.81',
      originalPrice: '$4.50',
      bonus: '+210 Bonus Diamonds',
      perks: [
        'Moonton Instant Server UID',
        '210 Diamonds + 70 Starlight Points',
        'Direct automated delivery in < 5s'
      ],
      icon: '/assets/games/mlbb_tile_4k.jpg',
      cover: '/assets/games/mlbb_hero_4k.jpg',
      hotTag: 'BEST VALUE'
    },
    {
      id: 'robuxsend',
      gameTitle: 'Roblox',
      dealName: '800 Robux Special Pack',
      tagline: 'Official Roblox Username Verified',
      badge: 'POPULAR',
      badgeColor: 'text-red-800 bg-red-50 border-red-200',
      accentColor: '#e11d48',
      accentGradient: 'from-red-600 via-rose-500 to-pink-500',
      threeColor: 0xe11d48,
      desc: 'Fast Robux deposit delivered directly to your official Roblox username with automated account verification.',
      price: '$6.99',
      originalPrice: '$8.50',
      bonus: '+50 Bonus Robux',
      perks: [
        'Username Account Verification',
        'No Password Ever Required',
        'Direct Delivery in < 15s'
      ],
      icon: '/assets/games/roblox_tile_4k.jpg',
      cover: '/assets/games/roblox_hero_4k.jpg',
      hotTag: 'HOT DEAL'
    },
    {
      id: 'ff',
      gameTitle: 'Free Fire',
      dealName: '520 Diamonds Special Pack',
      tagline: 'Garena Automated Direct UID',
      badge: 'TOP SELLER',
      badgeColor: 'text-orange-800 bg-orange-50 border-orange-200',
      accentColor: '#f97316',
      accentGradient: 'from-orange-500 via-amber-500 to-yellow-500',
      threeColor: 0xf97316,
      desc: 'Automated direct UID deposit for Cambodia and global servers. Receive +52 extra bonus diamonds with 100% anti-ban guarantee.',
      price: '$4.40',
      originalPrice: '$5.50',
      bonus: '+52 Bonus Diamonds',
      perks: [
        '5-Sec Direct Player UID',
        '100% Anti-Ban Guarantee',
        '0% Bakong KHQR Fee'
      ],
      icon: '/assets/games/freefire_tile_4k.jpg',
      cover: '/assets/games/freefire_hero_4k.jpg',
      hotTag: 'POPULAR'
    },
    {
      id: 'roslegacy',
      gameTitle: 'RoS Legacy',
      dealName: '680 + 68 Diamonds Pack',
      tagline: 'RoS Legacy Official Direct',
      badge: 'OFFICIAL',
      badgeColor: 'text-purple-800 bg-purple-50 border-purple-200',
      accentColor: '#a855f7',
      accentGradient: 'from-purple-600 via-indigo-500 to-blue-500',
      threeColor: 0xa855f7,
      desc: 'Safe public username top-up. Receive 680 diamonds plus 68 bonus diamonds with instant delivery.',
      price: '$9.99',
      originalPrice: '$11.99',
      bonus: '+68 Bonus Diamonds',
      perks: [
        'Official RoS Diamonds',
        'Safe Public Username Input',
        '24/7 Automated Dispatch'
      ],
      icon: '/assets/brand/yurigame-logo.webp',
      cover: '/assets/games/mlbb_hero_4k.jpg',
      hotTag: 'EXCLUSIVE'
    }
  ], []);

  // REAL THREE.JS WEBGL RENDERER & GLTF ENGINE SYNCHRONIZED WITH GSAP SCROLLTRIGGER
  useEffect(() => {
    if (!canvasRef.current || !sectionRef.current || !stageRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FFFFFF');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 7.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Studio Environment Reflections via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;

    // 2. Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 2.5);
    rimLight.position.set(-6, 2, -4);
    scene.add(rimLight);

    const pointSpecular = new THREE.PointLight(0x60a5fa, 2.5, 12);
    pointSpecular.position.set(0, 3.5, 4);
    scene.add(pointSpecular);

    // Soft Realistic Contact Shadow on White Ground
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.40)');
      grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.12)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(1.4, -2.1, 0);
    scene.add(contactShadow);

    // 3. 3D Model Group & Gemstone Material
    const modelGroup = new THREE.Group();
    modelGroup.position.set(1.4, 0, 0);
    scene.add(modelGroup);

    // Ultra-Reflective Physical Diamond Gem Material with Transmission & Dispersion
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.08,
      roughness: 0.03,
      transmission: 0.95,
      ior: 2.417, // True Diamond Refractive Index
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      thickness: 2.4,
      specularIntensity: 2.2,
      specularColor: new THREE.Color(0x93c5fd),
      envMapIntensity: 2.8,
      transparent: true,
      opacity: 0.98
    });

    // Procedural Fallback Faceted Gemstone (Renders instantly with zero delay)
    const fallbackGeo = new THREE.OctahedronGeometry(1.6, 2);
    fallbackGeo.computeVertexNormals();
    const fallbackMesh = new THREE.Mesh(fallbackGeo, diamondMaterial);
    fallbackMesh.castShadow = true;
    fallbackMesh.receiveShadow = true;
    modelGroup.add(fallbackMesh);

    // Load REAL 3D GLTF / GLB Model from Local Asset / GitHub Raw CDN
    const loader = new GLTFLoader();
    const loadModel = (url, isFallback = false) => {
      loader.load(
        url,
        (gltf) => {
          modelGroup.remove(fallbackMesh);
          const root = gltf.scene || gltf.scenes[0];
          root.traverse((child) => {
            if (child.isMesh) {
              child.material = diamondMaterial;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Auto-center and normalize scale
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scaleFactor = 3.2 / (maxDim || 1);
          root.scale.setScalar(scaleFactor);

          const center = box.getCenter(new THREE.Vector3());
          root.position.sub(center.multiplyScalar(scaleFactor));

          modelGroup.add(root);
          setModelLoaded(true);
        },
        undefined,
        (err) => {
          if (!isFallback) {
            console.warn('Local GLB failed, trying GitHub Raw CDN:', err);
            loadModel(GITHUB_RAW_DIAMOND_URL, true);
          } else {
            console.log('Using procedural crystal diamond geometry.');
            setModelLoaded(true);
          }
        }
      );
    };

    loadModel(LOCAL_DIAMOND_URL);

    // 4. GSAP SCROLLTRIGGER 3D SCENE ANIMATION TIMELINE (PINNED, SCRUB: 1)
    const ctx = gsap.context(() => {
      const total = deals.length;
      const cards = cardRefs.current;

      // Initial positions for UI product cards
      cards.forEach((card, i) => {
        if (!card) return;
        if (i === 0) {
          gsap.set(card, { opacity: 1, x: 0, scale: 1, pointerEvents: 'auto' });
        } else {
          gsap.set(card, { opacity: 0, x: -40, scale: 0.94, pointerEvents: 'none' });
        }
      });

      // Initial 3D model orientation
      gsap.set(modelGroup.rotation, { x: 0.15, y: 0, z: 0 });
      gsap.set(modelGroup.scale, { x: 1.3, y: 1.3, z: 1.3 });

      // Master ScrollTrigger timeline pinned with scrub: 1
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 72px',
          end: 'bottom bottom',
          pin: stageRef.current,
          pinSpacing: false,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            const idx = Math.min(total - 1, Math.floor(progress * total + 0.05));
            setActiveIndex(idx);
            setScrubProgress(progress);
          }
        }
      });

      // Milestones Animation: 3D Model Rotates X/Y/Z, Floats, Scales closer to Camera Viewport
      const stepDuration = 1;
      for (let s = 0; s < total - 1; s++) {
        const next = s + 1;
        const startTime = s * stepDuration;

        // --- 1. UI Card Stagger: Card s exits, Card next enters ---
        if (cards[s]) {
          masterTl.to(cards[s], {
            opacity: 0,
            x: -35,
            scale: 0.94,
            pointerEvents: 'none',
            duration: stepDuration * 0.45,
            ease: 'power2.in'
          }, startTime);
        }

        if (cards[next]) {
          masterTl.to(cards[next], {
            opacity: 1,
            x: 0,
            scale: 1,
            pointerEvents: 'auto',
            duration: stepDuration * 0.55,
            ease: 'power3.out'
          }, startTime + 0.42);
        }

        // --- 2. 3D Model Rotation & Camera Distance Scaling ---
        // Dynamically rotate across X, Y, and Z axes
        const targetRotY = (s + 1) * (Math.PI * 0.95);
        const targetRotX = ((s % 2 === 0 ? 1 : -1) * 0.35);
        const targetRotZ = ((s % 3 === 0 ? 0.25 : -0.2));
        const targetScale = s % 2 === 0 ? 1.75 : 1.45; // Zooms closer to camera!

        masterTl.to(modelGroup.rotation, {
          x: targetRotX,
          y: targetRotY,
          z: targetRotZ,
          duration: stepDuration,
          ease: 'power1.inOut'
        }, startTime);

        masterTl.to(modelGroup.scale, {
          x: targetScale,
          y: targetScale,
          z: targetScale,
          duration: stepDuration,
          ease: 'power1.inOut'
        }, startTime);

        // --- 3. Dynamic Gem Color & Lighting Tint shift to match game theme ---
        const nextColor = new THREE.Color(deals[next].threeColor);
        masterTl.to(diamondMaterial.specularColor, {
          r: nextColor.r,
          g: nextColor.g,
          b: nextColor.b,
          duration: stepDuration * 0.7,
          ease: 'power1.inOut'
        }, startTime + 0.2);

        masterTl.to(rimLight.color, {
          r: nextColor.r,
          g: nextColor.g,
          b: nextColor.b,
          duration: stepDuration * 0.7,
          ease: 'power1.inOut'
        }, startTime + 0.2);

        masterTl.to(pointSpecular.color, {
          r: nextColor.r,
          g: nextColor.g,
          b: nextColor.b,
          duration: stepDuration * 0.7,
          ease: 'power1.inOut'
        }, startTime + 0.2);
      }

      stRef.current = masterTl.scrollTrigger;
    }, sectionRef);

    // 5. Continuous 60fps Micro-Floating Hover & Render Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Subtle lifelike floating bobbing
      modelGroup.position.y = Math.sin(elapsed * 1.8) * 0.08;
      contactShadow.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.05);

      renderer.render(scene, camera);
    };
    animate();

    // 6. Handle Window Resize
    const handleResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      ctx.revert();
      renderer.dispose();
      pmremGenerator.dispose();
    };
  }, [deals]);

  // Navigate to Game Detail Page
  const handleNavigateToGame = useCallback((gameId) => {
    const targetGame = findAuthorizedGame(gameId);
    if (onSelectGame) onSelectGame(targetGame);
  }, [onSelectGame]);

  // Jump to specific deal smoothly using Lenis
  const handleJumpToDeal = useCallback((targetIdx) => {
    if (!stRef.current) return;
    const clamped = Math.max(0, Math.min(deals.length - 1, targetIdx));
    const progress = clamped / (deals.length - 1);
    const targetY = stRef.current.start + progress * (stRef.current.end - stRef.current.start) + 2;
    scrollToTarget(targetY, { duration: 0.85 });
  }, [deals.length]);

  return (
    // PINNED 3D WEBGL ENGINE SECTION: 3800px scroll track for silky scrub
    <section
      ref={sectionRef}
      id="deals"
      className="relative w-full bg-white select-none h-[3800px]"
    >
      {/* PINNED STAGE (calc(100vh-72px) locked under navbar) */}
      <div
        ref={stageRef}
        className="w-full h-[calc(100vh-72px)] overflow-hidden sticky top-[72px] flex flex-col justify-between py-4 sm:py-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white border-b border-slate-200/80"
      >
        {/* Soft Background Accent Glows */}
        <div className="absolute top-1/3 left-10 w-96 h-96 rounded-full bg-blue-100/40 blur-[140px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full bg-amber-100/30 blur-[140px] pointer-events-none -z-10" />

        {/* 1. TOP STATUS HEADER & STEPPER CONTROLS */}
        <div className="w-full pt-1 z-30 pointer-events-auto">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 mb-1 shadow-2xs">
                <Box size={13} className="text-blue-600 animate-pulse" />
                <span className="tracking-wider uppercase">REAL 3D WEBGL STUDIO · GLTF ENGINE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-gaming leading-tight">
                Featured Deals & 3D Diamond Passes
              </h2>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Official Direct Gateway · 0% Fee</span>
            </div>
          </div>

          {/* Interactive Stepper Navigation Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {deals.map((deal, idx) => (
              <button
                key={deal.id}
                type="button"
                onClick={() => handleJumpToDeal(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                  idx === activeIndex
                    ? 'bg-slate-950 text-white border-slate-950 shadow-sm scale-105'
                    : 'bg-white text-slate-600 hover:text-slate-950 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <img
                  src={deal.icon}
                  alt=""
                  className="w-4 h-4 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                  }}
                />
                <span>{deal.gameTitle.split(':')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  idx === activeIndex ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {deal.price}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. CENTER STAGE: THREE.JS 3D CANVAS + SYNCHRONIZED PRODUCT CARDS */}
        <div className="relative w-full flex-1 flex flex-col lg:flex-row items-center justify-between gap-6 my-auto overflow-hidden">
          
          {/* LEFT: Synchronized Product Details Deck */}
          <div className="w-full lg:max-w-xl text-left relative min-h-[380px] sm:min-h-[420px] flex items-center z-20">
            {deals.map((deal, idx) => {
              const isCurrent = idx === activeIndex;

              return (
                <div
                  key={deal.id}
                  ref={el => cardRefs.current[idx] = el}
                  className={`absolute inset-0 flex flex-col justify-center rounded-3xl p-6 sm:p-7 bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.14)] ${
                    isCurrent ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={deal.icon}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-200 shadow-sm"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-2xs">
                        <CheckCircle2 size={13} className="text-blue-600 fill-blue-600/20" />
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${deal.badgeColor}`}>
                      <Flame size={12} className="fill-current" />
                      <span>{deal.badge}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs">
                      <Zap size={12} className="text-blue-600" />
                      <span>{deal.tagline}</span>
                    </span>
                  </div>

                  {/* Title & Game */}
                  <div className="mb-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {deal.gameTitle}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-gaming leading-tight mt-0.5">
                      {deal.dealName}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-4 max-w-md">
                    {deal.desc}
                  </p>

                  {/* Key Perks */}
                  <div className="space-y-1.5 mb-5">
                    {deal.perks.map((perk, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                        <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price & Primary CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400 line-through font-mono font-medium">
                          {deal.originalPrice}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Sparkles size={11} className="text-amber-600" />
                          <span>{deal.bonus}</span>
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-slate-950 font-gaming tracking-tight">
                          {deal.price}
                        </span>
                        <span className="text-xs font-bold text-emerald-600">USD</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigateToGame(deal.id)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs tracking-wider uppercase shadow-[0_4px_18px_rgba(2,132,199,0.35)] hover:shadow-[0_6px_24px_rgba(2,132,199,0.5)] active:scale-95 transition-all cursor-pointer animate-sheen"
                    >
                      <span>TOP UP DIRECT</span>
                      <ArrowUpRight size={15} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* RIGHT: REAL THREE.JS 3D CANVAS (Rendering 3D Diamond/Crystal with Studio Shadows) */}
          <div className="w-full lg:flex-1 h-[360px] sm:h-[440px] lg:h-[480px] relative flex items-center justify-center">
            {/* 3D WebGL Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-grab active:cursor-grabbing"
              style={{ background: '#FFFFFF' }}
            />

            {/* 3D Asset Source Indicator Badge */}
            <div className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[10px] font-mono font-bold text-slate-600 shadow-2xs pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Three.js WebGL · GLTF Diamond</span>
            </div>
          </div>

        </div>

        {/* 3. BOTTOM BAR: SCROLL PROGRESS & FULL CATALOG PROMPT */}
        <div className="w-full pb-1 flex items-center justify-between pointer-events-none z-30">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 pointer-events-auto">
            <span className="text-slate-950 font-bold tracking-wider">
              0{activeIndex + 1} <span className="text-slate-400">/ 0{deals.length}</span>
            </span>
            <div className="w-24 sm:w-36 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(8, scrubProgress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] uppercase tracking-wider text-slate-700 hidden sm:inline font-sans font-bold">
              {deals[activeIndex]?.dealName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => scrollToTarget('#games', { offset: -60, duration: 0.9 })}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-700 hover:text-blue-600 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <span>EXPLORE FULL CATALOG</span>
            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform text-blue-600" />
          </button>
        </div>

      </div>
    </section>
  );
}
