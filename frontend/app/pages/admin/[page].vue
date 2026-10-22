<script setup lang="ts">
import AdminPage from '../../components/AdminPage.vue'

const route = useRoute()
const page = computed(() => `admin/${String(route.params.page || 'dashboard')}`)
</script>

<template>
  <AdminPage :page="page" />
</template>
