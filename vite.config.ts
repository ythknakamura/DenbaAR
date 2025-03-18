import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig({
  base: "./",
  build: {
    outDir: 'docs',
  },
  plugins: [svelte(), viteSingleFile()],
})
