import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss()
    ],
    // 开发模式：独立启动 (localhost:5173)
    server: {
        port: 5173,
        host: `0.0.0.0`,
        //  开发环境下将/api下的接口请求统一进行转发，以适配开发模式下的前端独立启动的方式
        proxy: {
            '/api': {
                target: `http://localhost:8787`,
                changeOrigin: true,
            },
        }
    },
    // 部署模式：打包输出到 根目录dist/nexus/client（完美匹配你的旧结构）
    build: {
        outDir: '../../dist/client',
        emptyOutDir: true, // 自动清空旧打包文件
        rollupOptions: {
            input: {
                main: "index.html",
                login: "/pages/login.html",
                admin: "/pages/admin.html",
            }
        }
    }
});