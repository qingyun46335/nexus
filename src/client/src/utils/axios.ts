import axios from "axios";

const axiosi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
})

const token = window.localStorage.getItem("token");
if (token) {
    axiosi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default axiosi