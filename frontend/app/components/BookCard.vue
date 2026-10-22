<script setup lang="ts">
import type { Book } from '../data/books'

defineProps<{ book: Book; showReads?: boolean }>()
const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites()
</script>

<template>
  <NuxtLink class="book-card" :to="{ path: '/buku-detail', query: { judul: book.title } }" :aria-label="`Lihat detail buku ${book.title}`">
    <div class="book-card__cover-wrap">
      <img class="book-card__cover" :src="book.cover || `https://picsum.photos/seed/${book.seed}/420/630`" :alt="`Sampul buku ${book.title} karya ${book.author}`" loading="lazy" />
      <button class="book-card__heart" :class="{ active: favoriteIds.includes(book.id) }" type="button" :aria-label="`${favoriteIds.includes(book.id) ? 'Hapus' : 'Simpan'} ${book.title} ${favoriteIds.includes(book.id) ? 'dari' : 'ke'} favorit`" @click.prevent.stop="toggleFavorite(book.id)">
        <svg width="18" height="18" viewBox="0 0 24 24" :fill="favoriteIds.includes(book.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="book-card__info">
      <h3 class="book-card__title">{{ book.title }}</h3>
      <p class="book-card__author">{{ book.author }}</p>
      <p v-if="showReads" class="book-card__reads"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>{{ book.reads }} dibaca</p>
    </div>
  </NuxtLink>
</template>