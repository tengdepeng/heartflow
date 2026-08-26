<template>
  <div
    class="crystal-landing"
    :style="{
      left: `${landingX}%`,
      top: `${landingY}%`,
      '--glow-color': glowColor,
      '--glow-radius': `${glowRadius}px`,
      '--intensity': intensity,
    }"
    :class="`phase-${phase}`"
  >
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 100 100"
      class="crystal-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- ===== Dodecahedron ===== -->
      <g v-if="crystalShape === 'dodecahedron'" class="crystal-shape">
        <!-- Outer hexagon -->
        <polygon
          points="50,5 87,23 87,77 50,95 13,77 13,23"
          :stroke="crystalColor"
          stroke-width="1.5"
          fill="none"
          class="crystal-edge"
        />
        <!-- Central pentagon -->
        <polygon
          points="50,28 72,42 64,70 36,70 28,42"
          :fill="crystalColor"
          fill-opacity="0.15"
          :stroke="crystalColor"
          stroke-width="1"
          class="crystal-face"
        />
        <!-- Connecting edges -->
        <line x1="50" y1="5" x2="50" y2="28" :stroke="crystalColor" stroke-width="1" />
        <line x1="87" y1="23" x2="72" y2="42" :stroke="crystalColor" stroke-width="1" />
        <line x1="87" y1="77" x2="64" y2="70" :stroke="crystalColor" stroke-width="1" />
        <line x1="50" y1="95" x2="50" y2="70" :stroke="crystalColor" stroke-width="1" />
        <line x1="13" y1="77" x2="36" y2="70" :stroke="crystalColor" stroke-width="1" />
        <line x1="13" y1="23" x2="28" y2="42" :stroke="crystalColor" stroke-width="1" />
        <!-- Inner pentagon edges -->
        <line x1="28" y1="42" x2="50" y2="28" :stroke="crystalColor" stroke-width="0.8" />
        <line x1="50" y1="28" x2="72" y2="42" :stroke="crystalColor" stroke-width="0.8" />
        <line x1="72" y1="42" x2="64" y2="70" :stroke="crystalColor" stroke-width="0.8" />
        <line x1="64" y1="70" x2="50" y2="70" :stroke="crystalColor" stroke-width="0.8" />
        <line x1="50" y1="70" x2="36" y2="70" :stroke="crystalColor" stroke-width="0.8" />
        <line x1="36" y1="70" x2="28" y2="42" :stroke="crystalColor" stroke-width="0.8" />
        <!-- Highlight facet -->
        <polygon
          points="50,28 72,42 64,70 50,70"
          :fill="crystalColor"
          fill-opacity="0.08"
          class="crystal-highlight"
        />
      </g>

      <!-- ===== Octahedron ===== -->
      <g v-else-if="crystalShape === 'octahedron'" class="crystal-shape">
        <!-- Upper pyramid -->
        <polygon
          points="50,5 90,50 50,50"
          :fill="crystalColor"
          fill-opacity="0.12"
          :stroke="crystalColor"
          stroke-width="1"
          class="crystal-face"
        />
        <polygon
          points="50,5 10,50 50,50"
          :fill="crystalColor"
          fill-opacity="0.08"
          :stroke="crystalColor"
          stroke-width="1"
          class="crystal-face"
        />
        <!-- Lower pyramid -->
        <polygon
          points="50,95 90,50 50,50"
          :fill="crystalColor"
          fill-opacity="0.15"
          :stroke="crystalColor"
          stroke-width="1"
          class="crystal-face"
        />
        <polygon
          points="50,95 10,50 50,50"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="1"
          class="crystal-face"
        />
        <!-- Outer edges -->
        <line x1="50" y1="5" x2="90" y2="50" :stroke="crystalColor" stroke-width="1.5" />
        <line x1="50" y1="5" x2="10" y2="50" :stroke="crystalColor" stroke-width="1.5" />
        <line x1="50" y1="95" x2="90" y2="50" :stroke="crystalColor" stroke-width="1.5" />
        <line x1="50" y1="95" x2="10" y2="50" :stroke="crystalColor" stroke-width="1.5" />
        <line x1="10" y1="50" x2="90" y2="50" :stroke="crystalColor" stroke-width="1.5" />
        <!-- Center axis -->
        <line x1="50" y1="5" x2="50" y2="95" :stroke="crystalColor" stroke-width="0.8" stroke-dasharray="4,3" />
      </g>

      <!-- ===== Tetrahedron ===== -->
      <g v-else-if="crystalShape === 'tetrahedron'" class="crystal-shape">
        <!-- Base triangle -->
        <polygon
          points="50,12 15,82 85,82"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="1.5"
          class="crystal-edge"
        />
        <!-- Left face -->
        <polygon
          points="50,12 15,82 50,68"
          :fill="crystalColor"
          fill-opacity="0.12"
          :stroke="crystalColor"
          stroke-width="0.8"
          class="crystal-face"
        />
        <!-- Right face -->
        <polygon
          points="50,12 85,82 50,68"
          :fill="crystalColor"
          fill-opacity="0.08"
          :stroke="crystalColor"
          stroke-width="0.8"
          class="crystal-face"
        />
        <!-- Bottom face -->
        <polygon
          points="15,82 85,82 50,68"
          :fill="crystalColor"
          fill-opacity="0.15"
          :stroke="crystalColor"
          stroke-width="0.8"
          class="crystal-face"
        />
        <!-- Center line -->
        <line x1="50" y1="12" x2="50" y2="68" :stroke="crystalColor" stroke-width="0.6" stroke-dasharray="3,2" />
      </g>

      <!-- ===== Sphere ===== -->
      <g v-else-if="crystalShape === 'sphere'" class="crystal-shape">
        <!-- Main circle -->
        <circle
          cx="50" cy="50" r="44"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="1.5"
          class="crystal-edge"
        />
        <!-- Longitude lines -->
        <ellipse cx="50" cy="50" rx="44" ry="12" :stroke="crystalColor" stroke-width="0.6" fill="none" />
        <ellipse cx="50" cy="50" rx="44" ry="28" :stroke="crystalColor" stroke-width="0.6" fill="none" />
        <!-- Latitude lines -->
        <ellipse cx="50" cy="50" rx="12" ry="44" :stroke="crystalColor" stroke-width="0.6" fill="none" />
        <ellipse cx="50" cy="50" rx="28" ry="44" :stroke="crystalColor" stroke-width="0.6" fill="none" />
        <!-- Highlight -->
        <ellipse cx="38" cy="35" rx="10" ry="14" :fill="crystalColor" fill-opacity="0.15" transform="rotate(-30, 38, 35)" />
        <!-- Core -->
        <circle cx="50" cy="50" r="6" :fill="crystalColor" fill-opacity="0.3" />
      </g>

      <!-- ===== Irregular ===== -->
      <g v-else-if="crystalShape === 'irregular'" class="crystal-shape">
        <!-- Outer irregular shape -->
        <polygon
          points="50,5 78,15 92,40 88,68 65,88 35,92 15,72 10,42 25,18"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="1.5"
          class="crystal-edge"
        />
        <!-- Internal facets -->
        <polygon
          points="50,5 78,15 50,45"
          :fill="crystalColor"
          fill-opacity="0.12"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="78,15 92,40 50,45"
          :fill="crystalColor"
          fill-opacity="0.08"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="92,40 88,68 50,45"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="88,68 65,88 50,45"
          :fill="crystalColor"
          fill-opacity="0.14"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="65,88 35,92 50,45"
          :fill="crystalColor"
          fill-opacity="0.12"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="35,92 15,72 50,45"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="15,72 10,42 50,45"
          :fill="crystalColor"
          fill-opacity="0.08"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="10,42 25,18 50,45"
          :fill="crystalColor"
          fill-opacity="0.06"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
        <polygon
          points="25,18 50,5 50,45"
          :fill="crystalColor"
          fill-opacity="0.1"
          :stroke="crystalColor"
          stroke-width="0.6"
          class="crystal-face"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  crystalColor?: string
  crystalShape?: 'sphere' | 'dodecahedron' | 'octahedron' | 'tetrahedron' | 'irregular'
  intensity?: number
  landingX?: number
  landingY?: number
}>(), {
  crystalColor: '#d4a574',
  crystalShape: 'dodecahedron',
  intensity: 0.5,
  landingX: 50,
  landingY: 30,
})

const emit = defineEmits<{
  'animation-done': []
}>()

const size = 60

const glowColor = computed(() => {
  return props.crystalColor
})

const glowRadius = computed(() => {
  return 4 + props.intensity * 16
})

const phase = ref<'falling' | 'bouncing' | 'settling' | 'glowing' | 'joining'>('falling')

onMounted(() => {
  // Phase 1: Falling (1.5s)
  setTimeout(() => {
    phase.value = 'bouncing'
  }, 1500)

  // Phase 2: Bouncing (0.8s)
  setTimeout(() => {
    phase.value = 'settling'
  }, 2300)

  // Phase 3: Settling + Glow start (1.2s)
  setTimeout(() => {
    phase.value = 'glowing'
  }, 3500)

  // Phase 4: Glowing (1.5s)
  setTimeout(() => {
    phase.value = 'joining'
  }, 5000)

  // Phase 5: Joining (1s) then emit done
  setTimeout(() => {
    emit('animation-done')
  }, 6000)
})
</script>

<style scoped>
.crystal-landing {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100;
  will-change: transform, opacity, filter;
}

.crystal-svg {
  display: block;
  overflow: visible;
}

.crystal-shape {
  transform-origin: center center;
}

/* ===== Phase 1: Falling ===== */
.phase-falling {
  animation: crystal-falling 1.5s cubic-bezier(0.42, 0, 0.58, 1) forwards;
}

@keyframes crystal-falling {
  0% {
    transform: translate(-50%, -50%) translateY(-400px) rotate(0deg);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  60% {
    transform: translate(-50%, -50%) translateY(0px) rotate(8deg);
    opacity: 1;
  }
  80% {
    transform: translate(-50%, -50%) translateY(-10px) rotate(-3deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translateY(0px) rotate(0deg);
    opacity: 1;
  }
}

/* ===== Phase 2: Bouncing ===== */
.phase-bouncing {
  animation: crystal-bounce 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}

@keyframes crystal-bounce {
  0% {
    transform: translate(-50%, -50%) translateY(0px) scale(1);
    opacity: 1;
  }
  15% {
    transform: translate(-50%, -50%) translateY(-35px) scale(1.05, 0.95);
    opacity: 1;
  }
  30% {
    transform: translate(-50%, -50%) translateY(0px) scale(0.95, 1.05);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) translateY(-18px) scale(1.02, 0.98);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) translateY(0px) scale(0.98, 1.02);
    opacity: 1;
  }
  85% {
    transform: translate(-50%, -50%) translateY(-6px) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translateY(0px) scale(1);
    opacity: 1;
  }
}

/* ===== Phase 3: Settling ===== */
.phase-settling {
  animation: crystal-settle 1.2s ease-out forwards;
}

@keyframes crystal-settle {
  0% {
    transform: translate(-50%, -50%) translateY(0px) scale(1);
    filter: drop-shadow(0 0 0px var(--glow-color));
    opacity: 1;
  }
  40% {
    transform: translate(-50%, -50%) translateY(-4px) scale(1.04);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.3) var(--glow-color));
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) translateY(0px) scale(0.98);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.5) var(--glow-color));
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translateY(0px) scale(1);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.4) var(--glow-color));
    opacity: 1;
  }
}

/* ===== Phase 4: Glowing ===== */
.phase-glowing {
  animation: crystal-glow 1.5s ease-in-out infinite alternate;
}

@keyframes crystal-glow {
  0% {
    transform: translate(-50%, -50%) scale(1);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.4) var(--glow-color))
            drop-shadow(0 0 calc(var(--glow-radius) * 0.8) var(--glow-color));
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.06);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.8) var(--glow-color))
            drop-shadow(0 0 calc(var(--glow-radius) * 1.6) color-mix(in srgb, var(--glow-color) 60%, transparent));
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.02);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.6) var(--glow-color))
            drop-shadow(0 0 calc(var(--glow-radius) * 1.2) color-mix(in srgb, var(--glow-color) 50%, transparent));
    opacity: 1;
  }
}

/* ===== Phase 5: Joining the cluster ===== */
.phase-joining {
  animation: crystal-join 1s cubic-bezier(0.55, 0, 0.1, 1) forwards;
}

@keyframes crystal-join {
  0% {
    transform: translate(-50%, -50%) scale(1) translateY(0px);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.6) var(--glow-color));
    opacity: 1;
  }
  40% {
    transform: translate(-50%, -50%) scale(0.9) translateY(8px);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.3) var(--glow-color));
    opacity: 0.9;
  }
  70% {
    transform: translate(-50%, -50%) scale(0.75) translateY(18px);
    filter: drop-shadow(0 0 calc(var(--glow-radius) * 0.1) var(--glow-color));
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.6) translateY(30px);
    filter: drop-shadow(0 0 0px transparent);
    opacity: 0.6;
  }
}
</style>