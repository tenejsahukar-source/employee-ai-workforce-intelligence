import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// -----------------------------------------------------------------------------
// REQUEST INTERCEPTOR
// Attach JWT token automatically to outgoing requests
// -----------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // FIXED: Now looking for 'access_token' to ensure consistency across the app
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ JWT attached");
    } else {
      console.warn("⚠ No JWT token found");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -----------------------------------------------------------------------------
// RESPONSE INTERCEPTOR
// Global error handler for API responses (e.g., catching expired tokens)
// -----------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend rejects the token or it expires, a 401 is thrown
    if (error.response?.status === 401) {
      console.error("❌ Session expired or unauthorized. Redirecting to login...");

      // Completely clear all authentication state
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");

      // Force a hard redirect to the login page
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;