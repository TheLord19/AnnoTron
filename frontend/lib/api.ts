// import axios from 'axios';

// // ✅ AUTO-SWITCH: Uses .env locally or on server
// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// export const api = axios.create({
//   baseURL: API_URL, 
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// export const getImageUrl = (path: string) => {
//     if (!path) return '';
//     if (path.startsWith('http')) return path;
    
//     // Clean path to prevent double slashes
//     const cleanPath = path.startsWith('/') ? path.substring(1) : path;
//     return `${API_URL}/${cleanPath}`;
// };