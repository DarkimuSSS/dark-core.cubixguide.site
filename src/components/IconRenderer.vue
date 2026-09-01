<script setup lang="ts">
import { computed } from 'vue';
import * as LucideIcons from 'lucide-vue-next';

const props = defineProps<{
  name: string;
  size?: number | string;
  class?: string | string[];
  color?: string;
}>();

const iconComponent = computed(() => {
  if (!props.name) return LucideIcons.HelpCircle;
  // Normalize string to PascalCase if needed
  const formattedName = props.name.charAt(0).toUpperCase() + props.name.slice(1);
  return (LucideIcons as Record<string, any>)[formattedName] || LucideIcons.HelpCircle;
});
</script>

<template>
  <component 
    :is="iconComponent" 
    :size="size || 18" 
    :class="props.class" 
    :style="color ? { color } : {}" 
  />
</template>
