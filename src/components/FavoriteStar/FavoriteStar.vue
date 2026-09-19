<script setup lang="ts">
defineProps<{ active: boolean; label: string }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <!-- mousedown is swallowed so pressing it never blurs (and closes) the search dropdown it may sit in -->
  <button
    type="button"
    :aria-pressed="active"
    :aria-label="label"
    :title="label"
    class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-accent hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
    @mousedown.prevent
    @click.stop="$emit('toggle')"
  >
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      :fill="active ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z" />
    </svg>
  </button>
</template>
