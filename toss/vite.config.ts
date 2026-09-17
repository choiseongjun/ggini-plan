import {defineConfig} from 'vite';
export default defineConfig({base:'/',resolve:{dedupe:['react','react-dom']},server:{port:5173},build:{target:'es2022'},esbuild:{jsx:'automatic'}});
