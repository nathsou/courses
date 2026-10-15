<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>

<template>
  <div class="counter">
    <h1>Counter</h1>
    <p :class="count > 5 ? 'big' : ''">Count: {{ count }}</p>
    <button @click="count++">+1</button>
  </div>
</template>