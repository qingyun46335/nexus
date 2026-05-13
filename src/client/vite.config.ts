import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss()
    ],
    // 开发模式：独立启动 (localhost:5173)
    server: {
        port: 5173,
        host: `0.0.0.0`
    },
    // 部署模式：打包输出到 根目录dist/nexus/client（完美匹配你的旧结构）
    build: {
        outDir: '../../dist/client',
        emptyOutDir: true, // 自动清空旧打包文件
    }
});