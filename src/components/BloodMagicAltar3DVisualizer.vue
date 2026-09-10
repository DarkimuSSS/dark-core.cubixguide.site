<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps<{
  tier: number;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const isRotating = ref(true);
const isWireframe = ref(false);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let altarGroup: THREE.Group;
let animationFrameId: number;

// Color Palette for Voxel Blocks
const BLOCK_COLORS = {
  bloodAltar: 0xe11d48, // Crimson / Red glow
  rune: 0x9f1239,       // Dark rune red
  runeGlow: 0xf43f5e,   // Rune accent line
  stone: 0x334155,       // Slate / Stone pillar
  glowstone: 0xf59e0b,   // Amber glow
  beacon: 0x06b6d4,      // Cyan beacon
  crystal: 0xa855f7      // Purple crystal
};

// Voxel Box Geometry Helper
const createVoxelBlock = (x: number, y: number, z: number, color: number, isAltar = false, isGlow = false) => {
  const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: isAltar ? 0.2 : 0.6,
    metalness: isAltar ? 0.8 : 0.2,
    wireframe: isWireframe.value,
    emissive: isAltar || isGlow ? color : 0x000000,
    emissiveIntensity: isAltar ? 0.6 : (isGlow ? 0.4 : 0)
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
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
  const altarCore = createVoxelBlock(0, 0.5, 0, BLOCK_COLORS.bloodAltar, true);
  altarGroup.add(altarCore);

  // Add PointLight inside Altar
  const altarLight = new THREE.PointLight(0xf43f5e, 3, 10);
  altarLight.position.set(0, 1, 0);
  altarGroup.add(altarLight);

  const t = props.tier;

  // 2. Tier II: Ring 3x3 of 8 Runes under altar (y = -1)
  if (t >= 2) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && z === 0) continue; // Altar is above
        altarGroup.add(createVoxelBlock(x, -0.5, z, BLOCK_COLORS.rune));
      }
    }
  }

  // 3. Tier III: 7x7 Ring & Corner Pillars (Height 2) + Glowstone
  if (t >= 3) {
    const r3Offsets = [-3, 3];
    // Pillars
    r3Offsets.forEach(px => {
      r3Offsets.forEach(pz => {
        altarGroup.add(createVoxelBlock(px, -0.5, pz, BLOCK_COLORS.stone));
        altarGroup.add(createVoxelBlock(px, 0.5, pz, BLOCK_COLORS.stone));
        // Cap
        altarGroup.add(createVoxelBlock(px, 1.5, pz, BLOCK_COLORS.glowstone, false, true));
      });
    });

    // Outer rune ring 7x7 (12 runes per side = 28 runes total)
    for (let i = -2; i <= 2; i++) {
      altarGroup.add(createVoxelBlock(i, -1.5, -3, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(i, -1.5, 3, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(-3, -1.5, i, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(3, -1.5, i, BLOCK_COLORS.rune));
    }
  }

  // 4. Tier IV: 11x11 Pillars & Blood Bricks (Height 4)
  if (t >= 4) {
    const r4Offsets = [-5, 5];
    r4Offsets.forEach(px => {
      r4Offsets.forEach(pz => {
        for (let h = -1.5; h <= 1.5; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.rune));
        }
        altarGroup.add(createVoxelBlock(px, 2.5, pz, BLOCK_COLORS.stone));
        altarGroup.add(createVoxelBlock(px, 3.5, pz, BLOCK_COLORS.bloodAltar, false, true));
      });
    });

    // 60 runes tier 4 ring
    for (let i = -4; i <= 4; i++) {
      altarGroup.add(createVoxelBlock(i, -2.5, -5, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(i, -2.5, 5, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(-5, -2.5, i, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(5, -2.5, i, BLOCK_COLORS.rune));
    }
  }

  // 5. Tier V: Beacons on 17x17 Corners
  if (t >= 5) {
    const r5Offsets = [-8, 8];
    r5Offsets.forEach(px => {
      r5Offsets.forEach(pz => {
        for (let h = -2.5; h <= 2.5; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone));
        }
        altarGroup.add(createVoxelBlock(px, 3.5, pz, BLOCK_COLORS.beacon, false, true));
      });
    });

    // 108 runes ring
    for (let i = -7; i <= 7; i++) {
      altarGroup.add(createVoxelBlock(i, -3.5, -8, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(i, -3.5, 8, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(-8, -3.5, i, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(8, -3.5, i, BLOCK_COLORS.rune));
    }
  }

  // 6. Tier VI: Crystal Clusters on 23x23 Corners
  if (t >= 6) {
    const r6Offsets = [-11, 11];
    r6Offsets.forEach(px => {
      r6Offsets.forEach(pz => {
        for (let h = -3.5; h <= 4.5; h++) {
          altarGroup.add(createVoxelBlock(px, h, pz, BLOCK_COLORS.stone));
        }
        altarGroup.add(createVoxelBlock(px, 5.5, pz, BLOCK_COLORS.crystal, false, true));
      });
    });

    // 164 runes ring
    for (let i = -10; i <= 10; i++) {
      altarGroup.add(createVoxelBlock(i, -4.5, -11, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(i, -4.5, 11, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(-11, -4.5, i, BLOCK_COLORS.rune));
      altarGroup.add(createVoxelBlock(11, -4.5, i, BLOCK_COLORS.rune));
    }
  }

  // Center & Adjust camera distance based on Tier size
  const camDist = 12 + t * 4.5;
  camera.position.set(camDist, camDist * 0.8, camDist);
  camera.lookAt(0, 0, 0);
};

const initThree = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight || 420;

  // 1. Scene setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c0d0e, 0.015);

  // 2. Camera setup
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  containerRef.value.appendChild(renderer.domElement);

  // 4. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffe4e6, 1.2);
  dirLight.position.set(20, 30, 15);
  scene.add(dirLight);

  const blueLight = new THREE.DirectionalLight(0x0284c7, 0.8);
  blueLight.position.set(-20, -10, -20);
  scene.add(blueLight);

  // 5. Altar Group
  altarGroup = new THREE.Group();
  scene.add(altarGroup);

  // Build blocks for current tier
  buildAltar3D();

  // Animation Loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    if (isRotating.value && altarGroup) {
      altarGroup.rotation.y += 0.005;
    }
    renderer.render(scene, camera);
  };
  animate();
};

const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight || 420;
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
    <!-- Header Controls for 3D View -->
    <div class="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/10 relative z-10">
      <div>
        <h3 class="text-lg font-black text-white flex items-center gap-2.5">
          <span class="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Интерактивная 3D Модель Алтаря (Tier {{ tier }})</span>
        </h3>
        <p class="text-xs text-slate-400">Полноценная трехмерная воксельная визуализация постройки</p>
      </div>

      <!-- 3D Controls -->
      <div class="flex items-center gap-2">
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

    <!-- 3D Canvas Canvas Container -->
    <div ref="containerRef" class="w-full h-[420px] rounded-2xl bg-[#090a0c] border border-white/10 relative cursor-grab active:cursor-grabbing overflow-hidden shadow-inner">
      
      <!-- Legend Overlay Badge -->
      <div class="absolute bottom-3 left-3 bg-[#0c0d0e]/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 text-[10px] space-y-1 z-10 pointer-events-none">
        <div class="font-bold text-slate-400 uppercase">Обозначение блоков:</div>
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
