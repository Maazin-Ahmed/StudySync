import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:4000/api' });

API.interceptors.request.use(cfg => {
    const token = localStorage.getItem('ss_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

export default API;
