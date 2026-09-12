<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps<{
  tier: number;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const isRotating = ref(true);
const isWireframe = ref(false);
const isSacrificing = ref(false);
const hoveredBlockInfo = ref<string | null>(null);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let altarGroup: THREE.Group;
let bloodParticlesGroup: THREE.Group;
let animationFrameId: number;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

// Mouse Drag Control State
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let currentRotationX = 0;
let currentRotationY = 0;

// Color Palette for Voxel Blocks (Authentic Minecraft & Blood Magic Palette)
const BLOCK_COLORS = {
  bloodAltar: 0xd97706,  // Blood Altar base gold/red stone accent
  rune: 0x475569,        // Rune stone slate / dark grey
  runeGlow: 0xe11d48,    // Crimson Rune accent
  stone: 0x1e293b,       // Dark Slate / Wool pillar stripes
  pillarSecondary: 0xf8fafc, // White wool / quartz pillar stripes
  glowstone: 0xd97706,   // Glowstone / Sea Lantern
  beacon: 0x06b6d4,      // Beacon cyan crystal
  crystal: 0xd946ef      // Crystal Cluster magenta glow
};

// Voxel Box Geometry Helper (Exact unit voxel grid)
const createVoxelBlock = (x: number, y: number, z: number, color: number, name: string, isAltar = false, isGlow = false) => {
  const geometry = new THREE.BoxGeometry(0.99, 0.99, 0.99);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: isAltar ? 0.3 : 0.5,
    metalness: isAltar ? 0.4 : 0.1,
    wireframe: isWireframe.value,
    emissive: isAltar || isGlow ? color : 0x000000,
    emissiveIntensity: isAltar ? 0.6 : (isGlow ? 0.6 : 0)
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.userData = { name, isAltar };
  return mesh;
};

// Build 3D Voxel Altar Multiblock for Tier 1-6
const buildAltar3D = () => {
  if (!altarGroup) return;
  
  // Clear previous meshes
  while (altarGroup.children.length > 0) {
    const obj = altarGroup.children[0];
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    altarGroup.remove(obj);
  }

  // Altar center is at y = 0
  // 1. Central Blood Altar Core (0, 0, 0)
  const altarCore = createVoxelBlock(0, 0, 0, BLOCK_COLORS.bloodAltar, 'Кровавый Алтарь (Blood Altar)', true);
  altarGroup.add(altarCore);

  const altarLight = new THREE.PointLight(0xf43f5e, 4, 12);
  altarLight.position.set(0, 0.8, 0);
  altarGroup.add(altarLight);

  const t = props.tier;

  // 2. Tier II: Ring 3x3 of 8 Runes directly under altar (y = -1)
  if (t >= 2) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && z === 0) continue; // Under altar core
        altarGroup.add(createVoxelBlock(x, -1, z, BLOCK_COLORS.rune, 'Руна Tier 2'));
      }
    }
  }

  // 3. Tier III: 7x7 outer ring at y = -2, with 4 corner pillars (Height 2 stone/wool + Glowstone on top at y = 0)
  if (t >= 3) {
    // 5 runes per side connecting corners at (-3, -2, -2..2), (3, -2, -2..2), etc. Total = 20 runes for T3 ring (28 cumulative)
    for (let i = -2; i <= 2; i++) {
      altarGroup.add(createVoxelBlock(i, -2, -3, BLOCK_COLORS.rune, 'Руна Tier 3'));
      altarGroup.add(createVoxelBlock(i, -2, 3, BLOCK_COLORS.rune, 'Руна Tier 3'));
      altarGroup.add(createVoxelBlock(-3, -2, i, BLOCK_COLORS.rune, 'Руна Tier 3'));
      altarGroup.add(createVoxelBlock(3, -2, i, BLOCK_COLORS.rune, 'Руна Tier 3'));
    }

    // 4 Corner Pillars: at (-3, -3), (-3, 3), (3, -3), (3, 3)
    // Base at y = -2, body at y = -1, cap (Glowstone/Glass) at y = 0
    const r3Corners = [-3, 3];
    r3Corners.forEach(px => {
      r3Corners.forEach(pz => {
        altarGroup.add(createVoxelBlock(px, -2, pz, BLOCK_COLORS.stone, 'Основание столба Tier 3'));
        altarGroup.add(createVoxelBlock(px, -1, pz, BLOCK_COLORS.stone, 'Каменный столб Tier 3'));
        altarGroup.add(createVoxelBlock(px, 0, pz, BLOCK_COLORS.glowstone, 'Светящийся камень / Колпак', false, true));
      });
    });
  }

  // 4. Tier IV: 11x11 outer ring at y = -3, with 4 corner pillars (Height 4 stone/wool + Blood Stone Brick cap at y = 2)
  if (t >= 4) {
    // 7 runes per side at (-5, -3, -3..3), etc. Total = 28 runes for T4 ring (60 cumulative)
    for (let i = -3; i <= 3; i++) {
      altarGroup.add(createVoxelBlock(i, -3, -5, BLOCK_COLORS.rune, 'Руна Tier 4'));
      altarGroup.add(createVoxelBlock(i, -3, 5, BLOCK_COLORS.rune, 'Руна Tier 4'));
      altarGroup.add(createVoxelBlock(-5, -3, i, BLOCK_COLORS.rune, 'Руна Tier 4'));
      altarGroup.add(createVoxelBlock(5, -3, i, BLOCK_COLORS.rune, 'Руна Tier 4'));
    }

    // 4 Corner Pillars: at (-5, -5), (-5, 5), (5, -5), (5, 5)
    // Heights y = -3, -2, -1, 0, 1 (Body height 4), cap (Blood Stone Brick) at y = 2
    const r4Corners = [-5, 5];
    r4Corners.forEach(px => {
      r4Corners.forEach(pz => {
        for (let h = -3; h <= 1; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone, 'Столб Tier 4'));
        }
        altarGroup.add(createVoxelBlock(px, 2, pz, BLOCK_COLORS.bloodAltar, 'Большой кровавый кирпич (Blood Stone Brick)', false, true));
      });
    });
  }

  // 5. Tier V: 17x17 outer ring at y = -4, with 4 corner pillars (Height 6 stone/wool + Beacon cap at y = 3)
  if (t >= 5) {
    // 12 runes per side at (-8, -4, -5..6), etc. Total = 48 runes for T5 ring (108 cumulative)
    for (let i = -5; i <= 6; i++) {
      if (i === -6 || i === 7) continue;
      altarGroup.add(createVoxelBlock(i, -4, -8, BLOCK_COLORS.rune, 'Руна Tier 5'));
      altarGroup.add(createVoxelBlock(i, -4, 8, BLOCK_COLORS.rune, 'Руна Tier 5'));
      altarGroup.add(createVoxelBlock(-8, -4, i, BLOCK_COLORS.rune, 'Руна Tier 5'));
      altarGroup.add(createVoxelBlock(8, -4, i, BLOCK_COLORS.rune, 'Руна Tier 5'));
    }

    // 4 Corner Pillars: at (-8, -8), (-8, 8), (8, -8), (8, 8)
    // Heights y = -4 to 2 (Body height 6), cap (Beacon) at y = 3
    const r5Corners = [-8, 8];
    r5Corners.forEach(px => {
      r5Corners.forEach(pz => {
        for (let h = -4; h <= 2; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone, 'Столб Tier 5'));
        }
        altarGroup.add(createVoxelBlock(px, 3, pz, BLOCK_COLORS.beacon, 'Маяк (Beacon)', false, true));
      });
    });
  }

  // 6. Tier VI: 23x23 outer ring at y = -5, with 4 corner pillars (Height 8 stone/wool + Crystal Cluster cap at y = 4)
  if (t >= 6) {
    // 14 runes per side at (-11, -5, -6..7), etc. Total = 56 runes for T6 ring (164 cumulative)
    for (let i = -6; i <= 7; i++) {
      if (i === -7 || i === 8) continue;
      altarGroup.add(createVoxelBlock(i, -5, -11, BLOCK_COLORS.rune, 'Руна Tier 6'));
      altarGroup.add(createVoxelBlock(i, -5, 11, BLOCK_COLORS.rune, 'Руна Tier 6'));
      altarGroup.add(createVoxelBlock(-11, -5, i, BLOCK_COLORS.rune, 'Руна Tier 6'));
      altarGroup.add(createVoxelBlock(11, -5, i, BLOCK_COLORS.rune, 'Руна Tier 6'));
    }

    // 4 Corner Pillars: at (-11, -11), (-11, 11), (11, -11), (11, 11)
    // Heights y = -5 to 3 (Body height 8), cap (Crystal Cluster) at y = 4
    const r6Corners = [-11, 11];
    r6Corners.forEach(px => {
      r6Corners.forEach(pz => {
        for (let h = -5; h <= 3; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone, 'Столб Tier 6'));
        }
        altarGroup.add(createVoxelBlock(px, 4, pz, BLOCK_COLORS.crystal, 'Кристальный пилон (Crystal Cluster)', false, true));
      });
    });
  }

const resetRotationAndCamera = () => {
  currentRotationX = 0;
  currentRotationY = 0;
  if (altarGroup) {
    altarGroup.rotation.set(0, 0, 0);
  }
  const camDist = 6 + props.tier * 2.8;
  if (camera) {
    camera.position.set(camDist, camDist * 0.75, camDist);
    camera.lookAt(0, 0, 0);
  }
};

  resetRotationAndCamera();
};

// Animation Loop
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);

  if (altarGroup) {
    if (isRotating.value && !isDragging) {
      altarGroup.rotation.y += 0.005;
      currentRotationY = altarGroup.rotation.y;
    } else {
      altarGroup.rotation.y = currentRotationY;
      altarGroup.rotation.x = currentRotationX;
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

// Spawn Ritual Blood LP Explosion Particles
const createBloodSacrificeEffect = () => {
  if (!bloodParticlesGroup) return;
  isSacrificing.value = true;

  const particleCount = 60;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = 0.8 + Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

    velocities.push({
      x: (Math.random() - 0.5) * 0.15,
      y: 0.1 + Math.random() * 0.2,
      z: (Math.random() - 0.5) * 0.15
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf43f5e,
    size: 0.25,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });

  const pSystem = new THREE.Points(geometry, material);
  bloodParticlesGroup.add(pSystem);

  let frame = 0;
  const animateParticles = () => {
    frame++;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      posArr[i * 3] += velocities[i].x;
      posArr[i * 3 + 1] += velocities[i].y;
      posArr[i * 3 + 2] += velocities[i].z;
      velocities[i].y -= 0.005; // Gravity
    }
    posAttr.needsUpdate = true;
    material.opacity -= 0.02;

    if (frame < 45) {
      requestAnimationFrame(animateParticles);
    } else {
      bloodParticlesGroup.remove(pSystem);
      geometry.dispose();
      material.dispose();
      isSacrificing.value = false;
    }
  };
  animateParticles();
};

const initThree = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight || 450;

  // Raycaster for mouse interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c0d0e, 0.015);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  containerRef.value.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe4e6, 1.4);
  dirLight.position.set(20, 30, 15);
  scene.add(dirLight);

  const blueLight = new THREE.DirectionalLight(0x0284c7, 0.9);
  blueLight.position.set(-20, -10, -20);
  scene.add(blueLight);

  altarGroup = new THREE.Group();
  scene.add(altarGroup);

  bloodParticlesGroup = new THREE.Group();
  scene.add(bloodParticlesGroup);

  buildAltar3D();
  animate();
};

// Drag & Hover Event Handlers
const onMouseDown = (e: MouseEvent) => {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };
};

const onMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / containerRef.value.clientWidth) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / containerRef.value.clientHeight) * 2 + 1;

  if (isDragging && altarGroup) {
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    currentRotationY += deltaX * 0.01;
    currentRotationX += deltaY * 0.01;
    currentRotationX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, currentRotationX));

    previousMousePosition = { x: e.clientX, y: e.clientY };
  } else if (camera && altarGroup) {
    // Hover raycasting
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(altarGroup.children);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData && hit.userData.name) {
        hoveredBlockInfo.value = hit.userData.name;
      }
    } else {
      hoveredBlockInfo.value = null;
    }
  }
};

const onMouseUp = () => {
  isDragging = false;
};

const MIN_ZOOM_DIST = 5;
const MAX_ZOOM_DIST = 45;

const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  if (camera) {
    const currentDist = camera.position.length();
    const zoomDelta = e.deltaY * 0.025;
    const newDist = Math.max(MIN_ZOOM_DIST, Math.min(MAX_ZOOM_DIST, currentDist + zoomDelta));
    const factor = newDist / currentDist;

    camera.position.x *= factor;
    camera.position.y *= factor;
    camera.position.z *= factor;
  }
};

const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight || 450;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

watch(() => props.tier, () => {
  buildAltar3D();
});

watch(isWireframe, () => {
  buildAltar3D();
});

onMounted(() => {
  initThree();
  window.addEventListener('resize', handleResize);
  if (containerRef.value) {
    containerRef.value.addEventListener('wheel', onWheel, { passive: false });
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (renderer && renderer.domElement) {
    renderer.domElement.remove();
    renderer.dispose();
  }
});
</script>

<template>
  <div class="p-5 sm:p-6 rounded-3xl bg-[#121417] border border-white/10 shadow-2xl space-y-4 relative overflow-hidden">
    <!-- Header Controls for Interactive 3D View -->
    <div class="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10 relative z-10">
      <div>
        <h3 class="text-base font-black text-white flex items-center gap-2">
          <IconRenderer name="Box" size="18" class="text-rose-400" />
          <span>Интерактивный 3D Алтарь Blood Magic (Tier {{ tier }})</span>
        </h3>
        <p class="text-xs text-slate-400">Вращайте зажатием мыши, приближайте колесиком и наводите на блоки</p>
      </div>

      <!-- 3D Controls & Interactive Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="resetRotationAndCamera"
          class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          title="Сбросить камеру и ракурс структуры"
        >
          <IconRenderer name="RotateCcw" size="13" class="text-rose-400" />
          <span>Сброс позиции</span>
        </button>

        <button
          @click="isRotating = !isRotating"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer',
            isRotating ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/5 text-slate-400 border-white/10'
          ]"
        >
          <span>{{ isRotating ? '⏸ Вращение' : '▶ Статика' }}</span>
        </button>

        <button
          @click="isWireframe = !isWireframe"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer',
            isWireframe ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-400 border-white/10'
          ]"
        >
          <span>{{ isWireframe ? '🔷 Каркас' : '🧱 Блоки' }}</span>
        </button>
      </div>
    </div>

    <!-- 3D Canvas Container with Drag & Zoom Events -->
    <div
      ref="containerRef"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      class="w-full h-[450px] rounded-2xl bg-[#090a0c] border border-white/10 relative cursor-grab active:cursor-grabbing overflow-hidden shadow-inner select-none"
    >
      <!-- Hovered Block Tooltip Overlay -->
      <div v-if="hoveredBlockInfo" class="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-rose-500/40 px-4 py-1.5 rounded-full text-xs font-black text-rose-300 shadow-xl z-20 pointer-events-none flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
        <span>{{ hoveredBlockInfo }}</span>
      </div>

      <!-- Legend Overlay Badge -->
      <div class="absolute bottom-3 left-3 bg-[#0c0d0e]/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 text-[10px] space-y-1 z-10 pointer-events-none">
        <div class="font-bold text-slate-400 uppercase">Обозначения блоков:</div>
        <div class="flex items-center gap-3 flex-wrap">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-rose-500"></span> Алтарь</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-rose-900"></span> Руны</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-slate-600"></span> Камень</span>
          <span v-if="tier >= 3" class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-500"></span> Глоустоун</span>
          <span v-if="tier >= 5" class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-cyan-400"></span> Маяк</span>
          <span v-if="tier >= 6" class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-purple-500"></span> Кристалл</span>
        </div>
      </div>
    </div>
  </div>
</template>
