<script setup lang="ts">
const count = ref(0);
</script>

<template>
  <div style="padding: 20px">
    <h1>Nuxt 4 Counter</h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>
