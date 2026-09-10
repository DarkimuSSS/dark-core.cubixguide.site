<script setup lang="ts">
import { computed, shallowRef, watchEffect, type Component } from 'vue';
import {
  HelpCircle,
  Menu,
  ChevronDown,
  X,
  Compass,
  Home,
  BookOpen,
  Star,
  Shield,
  ShieldCheck,
  Sparkles,
  Palette,
  Edit3,
  TrendingUp,
  FileText,
  Sliders,
  Users,
  BarChart2,
  Settings,
  Search,
  UserPlus,
  UserCheck,
  Plus,
  AlertCircle,
  Info,
  Check,
  Copy,
  RotateCw,
  Clock,
  ExternalLink,
  Eye,
  Trash2,
  Tag,
  Folder,
  Layers,
  Cpu,
  Zap,
  CheckSquare,
  Smile,
  Gamepad2,
  MapPin,
  ShieldAlert,
  Crown
} from 'lucide-vue-next';

const props = defineProps<{
  name: string;
  size?: number | string;
  class?: string | string[];
  color?: string;
}>();

const KNOWN_ICONS: Record<string, Component> = {
  HelpCircle,
  Menu,
  ChevronDown,
  X,
  Compass,
  Home,
  BookOpen,
  Star,
  Shield,
  ShieldCheck,
  Sparkles,
  Palette,
  Edit3,
  TrendingUp,
  FileText,
  Sliders,
  Users,
  BarChart2,
  Settings,
  Search,
  UserPlus,
  UserCheck,
  Plus,
  AlertCircle,
  Info,
  Check,
  Copy,
  RotateCw,
  Clock,
  ExternalLink,
  Eye,
  Trash2,
  Tag,
  Folder,
  Layers,
  Cpu,
  Zap,
  CheckSquare,
  Smile,
  Gamepad2,
  MapPin,
  ShieldAlert,
  Crown
};

const dynamicIconComponent = shallowRef<Component | null>(null);

watchEffect(() => {
  if (!props.name || typeof props.name !== 'string') {
    dynamicIconComponent.value = HelpCircle;
    return;
  }
  const formattedName = props.name.charAt(0).toUpperCase() + props.name.slice(1);
  if (KNOWN_ICONS[formattedName]) {
    dynamicIconComponent.value = KNOWN_ICONS[formattedName];
  } else {
    // Dynamic import fallback for rare icons without bundling the whole library synchronously
    import('lucide-vue-next').then((module: any) => {
      dynamicIconComponent.value = module[formattedName] || HelpCircle;
    }).catch(() => {
      dynamicIconComponent.value = HelpCircle;
    });
  }
});
</script>

<template>
  <component 
    :is="dynamicIconComponent || HelpCircle" 
    :size="size || 18" 
    :class="props.class" 
    :style="color ? { color } : {}" 
  />
</template>

