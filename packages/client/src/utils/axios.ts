import axios from "axios";

const axiosi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
})

const token = window.localStorage.getItem("token");
if (token) {
    axiosi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

axiosi.interceptors.response.use(
    response => response,
    error => {
        const url = error.config?.url ?? "";

        if (error.response?.status === 401 && url.startsWith("/api/admin/")) {
            window.toast.warning("登录已失效")
        } else if (error.response?.status === 403 && url.startsWith("/api/admin")) {
            window.toast.error("权限不足")
        }

        return Promise.reject(error)
    }
)

export default axiosi