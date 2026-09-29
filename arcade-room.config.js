import {defineConfig} from 'vite';
export default defineConfig({base:'./',publicDir:'public/arcade-room',server:{host:'127.0.0.1',port:4325,strictPort:true},build:{outDir:'dist-arcade-room',rollupOptions:{input:'arcade-room.html'}}});
