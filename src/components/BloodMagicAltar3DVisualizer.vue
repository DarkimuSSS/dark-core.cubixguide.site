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

// Color Palette for Voxel Blocks
const BLOCK_COLORS = {
  bloodAltar: 0xe11d48, // Crimson / Red glow
  rune: 0x881337,       // Dark rune red
  runeGlow: 0xf43f5e,   // Rune accent line
  stone: 0x334155,       // Slate / Stone pillar
  glowstone: 0xf59e0b,   // Amber glow
  beacon: 0x06b6d4,      // Cyan beacon
  crystal: 0xa855f7      // Purple crystal
};

// Voxel Box Geometry Helper
const createVoxelBlock = (x: number, y: number, z: number, color: number, name: string, isAltar = false, isGlow = false) => {
  const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: isAltar ? 0.15 : 0.5,
    metalness: isAltar ? 0.8 : 0.3,
    wireframe: isWireframe.value,
    emissive: isAltar || isGlow ? color : 0x000000,
    emissiveIntensity: isAltar ? 0.8 : (isGlow ? 0.5 : 0)
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

  // 1. Central Blood Altar Core (x:0, y:0, z:0)
  const altarCore = createVoxelBlock(0, 0.5, 0, BLOCK_COLORS.bloodAltar, 'Кровавый Алтарь (Blood Altar)', true);
  altarGroup.add(altarCore);

  // Add PointLight inside Altar
  const altarLight = new THREE.PointLight(0xf43f5e, 4, 12);
  altarLight.position.set(0, 1.2, 0);
  altarGroup.add(altarLight);

  const t = props.tier;

  // 2. Tier II: Ring 3x3 of 8 Runes under altar (y = -1)
  if (t >= 2) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && z === 0) continue; // Altar is above
        altarGroup.add(createVoxelBlock(x, -0.5, z, BLOCK_COLORS.rune, 'Руна (Rune Block)'));
      }
    }
  }

  // 3. Tier III: 7x7 Ring & Corner Pillars (Height 2) + Glowstone
  if (t >= 3) {
    const r3Offsets = [-3, 3];
    r3Offsets.forEach(px => {
      r3Offsets.forEach(pz => {
        altarGroup.add(createVoxelBlock(px, -0.5, pz, BLOCK_COLORS.stone, 'Каменный столб'));
        altarGroup.add(createVoxelBlock(px, 0.5, pz, BLOCK_COLORS.stone, 'Каменный столб'));
        altarGroup.add(createVoxelBlock(px, 1.5, pz, BLOCK_COLORS.glowstone, 'Светящийся камень (Glowstone)', false, true));
      });
    });

    for (let i = -2; i <= 2; i++) {
      altarGroup.add(createVoxelBlock(i, -1.5, -3, BLOCK_COLORS.rune, 'Руна (Tier 3)'));
      altarGroup.add(createVoxelBlock(i, -1.5, 3, BLOCK_COLORS.rune, 'Руна (Tier 3)'));
      altarGroup.add(createVoxelBlock(-3, -1.5, i, BLOCK_COLORS.rune, 'Руна (Tier 3)'));
      altarGroup.add(createVoxelBlock(3, -1.5, i, BLOCK_COLORS.rune, 'Руна (Tier 3)'));
    }
  }

  // 4. Tier IV: 11x11 Pillars & Blood Bricks (Height 4)
  if (t >= 4) {
    const r4Offsets = [-5, 5];
    r4Offsets.forEach(px => {
      r4Offsets.forEach(pz => {
        for (let h = -1.5; h <= 1.5; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone, 'Столб Tier 4'));
        }
        altarGroup.add(createVoxelBlock(px, 2.5, pz, BLOCK_COLORS.stone, 'Столб Tier 4'));
        altarGroup.add(createVoxelBlock(px, 3.5, pz, BLOCK_COLORS.bloodAltar, 'Большой кровавый кирпич', false, true));
      });
    });

    for (let i = -4; i <= 4; i++) {
      altarGroup.add(createVoxelBlock(i, -2.5, -5, BLOCK_COLORS.rune, 'Руна (Tier 4)'));
      altarGroup.add(createVoxelBlock(i, -2.5, 5, BLOCK_COLORS.rune, 'Руна (Tier 4)'));
      altarGroup.add(createVoxelBlock(-5, -2.5, i, BLOCK_COLORS.rune, 'Руна (Tier 4)'));
      altarGroup.add(createVoxelBlock(5, -2.5, i, BLOCK_COLORS.rune, 'Руна (Tier 4)'));
    }
  }

  // 5. Tier V: Beacons on 17x17 Corners
  if (t >= 5) {
    const r5Offsets = [-8, 8];
    r5Offsets.forEach(px => {
      r5Offsets.forEach(pz => {
        for (let h = -2.5; h <= 2.5; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone, 'Столб Tier 5'));
        }
        altarGroup.add(createVoxelBlock(px, 3.5, pz, BLOCK_COLORS.beacon, 'Маяк (Beacon)', false, true));
      });
    });

    for (let i = -7; i <= 7; i++) {
      altarGroup.add(createVoxelBlock(i, -3.5, -8, BLOCK_COLORS.rune, 'Руна (Tier 5)'));
      altarGroup.add(createVoxelBlock(i, -3.5, 8, BLOCK_COLORS.rune, 'Руна (Tier 5)'));
      altarGroup.add(createVoxelBlock(-8, -3.5, i, BLOCK_COLORS.rune, 'Руна (Tier 5)'));
      altarGroup.add(createVoxelBlock(8, -3.5, i, BLOCK_COLORS.rune, 'Руна (Tier 5)'));
    }
  }

  // 6. Tier VI: Crystal Clusters on 23x23 Corners
  if (t >= 6) {
    const r6Offsets = [-11, 11];
    r6Offsets.forEach(px => {
      r6Offsets.forEach(pz => {
        for (let h = -3.5; h <= 4.5; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone, 'Столб Tier 6'));
        }
        altarGroup.add(createVoxelBlock(px, 5.5, pz, BLOCK_COLORS.crystal, 'Кристальный пилон (Crystal Cluster)', false, true));
      });
    });

    for (let i = -10; i <= 10; i++) {
      altarGroup.add(createVoxelBlock(i, -4.5, -11, BLOCK_COLORS.rune, 'Руна (Tier 6)'));
      altarGroup.add(createVoxelBlock(i, -4.5, 11, BLOCK_COLORS.rune, 'Руна (Tier 6)'));
      altarGroup.add(createVoxelBlock(-11, -4.5, i, BLOCK_COLORS.rune, 'Руна (Tier 6)'));
      altarGroup.add(createVoxelBlock(11, -4.5, i, BLOCK_COLORS.rune, 'Руна (Tier 6)'));
    }
  }

  // Closer Camera distance calculation (Much closer view!)
  const camDist = 6 + t * 2.8;
  camera.position.set(camDist, camDist * 0.75, camDist);
  camera.lookAt(0, 0, 0);
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

  // Animation Loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);

    if (isRotating.value && altarGroup && !isDragging) {
      altarGroup.rotation.y += 0.005;
    } else if (altarGroup) {
      altarGroup.rotation.y = currentRotationY;
      altarGroup.rotation.x = currentRotationX;
    }

    renderer.render(scene, camera);
  };
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

const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  if (camera) {
    const zoomFactor = e.deltaY * 0.02;
    camera.position.x += zoomFactor * (camera.position.x > 0 ? 1 : -1);
    camera.position.y += zoomFactor * (camera.position.y > 0 ? 1 : -1);
    camera.position.z += zoomFactor * (camera.position.z > 0 ? 1 : -1);
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
  <div class="p-6 sm:p-8 rounded-3xl bg-[#121417] border border-rose-500/30 shadow-2xl space-y-4 relative overflow-hidden group">
    <!-- Header Controls for Interactive 3D View -->
    <div class="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/10 relative z-10">
      <div>
        <h3 class="text-lg font-black text-white flex items-center gap-2.5">
          <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
          <span>Интерактивный 3D Алтарь Blood Magic (Tier {{ tier }})</span>
        </h3>
        <p class="text-xs text-slate-400">Вращайте зажатием мыши, приближайте колесиком и нажимайте Ритуал</p>
      </div>

      <!-- 3D Controls & Interactive Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="createBloodSacrificeEffect"
          :disabled="isSacrificing"
          class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/60 active:scale-95 border border-rose-400/40"
        >
          <span>🩸 Совершить Ритуал LP</span>
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
