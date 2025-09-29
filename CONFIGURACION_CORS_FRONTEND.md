# 🔒 Guía de Configuración CORS - Frontend

## ❌ Problema Solucionado
El error "Ensure credentialed requests are not sent to CORS resources with origin wildcards" ha sido resuelto configurando orígenes específicos en lugar de usar wildcards (`*`).

## ✅ Configuración del Frontend

### **1. Para React/Next.js**

```javascript
// config/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Configuración con fetch
export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      credentials: 'include', // ✅ IMPORTANTE: Incluir credenciales
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    return response.json();
  }
};

// Configuración con Axios
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ✅ IMPORTANTE: Incluir credenciales
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### **2. Para Vue.js**

```javascript
// plugins/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000',
  withCredentials: true, // ✅ IMPORTANTE: Incluir credenciales
});

// Interceptor para token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### **3. Para Angular**

```typescript
// services/http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
      withCredentials: true // ✅ IMPORTANTE: Incluir credenciales
    };
  }

  get(endpoint: string) {
    return this.http.get(`${this.apiUrl}${endpoint}`, this.getHttpOptions());
  }

  post(endpoint: string, data: any) {
    return this.http.post(`${this.apiUrl}${endpoint}`, data, this.getHttpOptions());
  }
}
```

## 🌐 URLs Permitidas por el Backend

El backend ahora acepta requests desde estas URLs:

### **Desarrollo:**
- `http://localhost:3000` (React)
- `http://localhost:5173` (Vite)
- `http://localhost:4200` (Angular)
- `http://localhost:8080` (Vue)
- `http://127.0.0.1:3000` (localhost alternativo)

### **Personalizar URLs:**
Agregar nuevas URLs en el archivo `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://mi-dominio.com
```

## 🔐 Autenticación con JWT

### **Ejemplo completo de login:**

```javascript
// services/auth.service.js
export const authService = {
  async login(email, password) {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      credentials: 'include', // ✅ Incluir credenciales
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.success && data.data.token) {
      // Guardar token para requests futuros
      localStorage.setItem('authToken', data.data.token);
    }
    
    return data;
  },

  async getProfile() {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include', // ✅ Incluir credenciales
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
};
```

## 🚀 Variables de Entorno del Frontend

### **React (.env):**
```bash
REACT_APP_API_URL=http://localhost:3000
```

### **Vue (.env):**
```bash
VUE_APP_API_URL=http://localhost:3000
```

### **Angular (environment.ts):**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

## ✅ Verificar que Funciona

```javascript
// test/cors-test.js
async function testCORS() {
  try {
    const response = await fetch('http://localhost:3000/health', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('✅ CORS funcionando:', data);
  } catch (error) {
    console.error('❌ Error CORS:', error);
  }
}

testCORS();
```

## 🔧 Troubleshooting

### **Si aún tienes errores CORS:**

1. **Verifica la URL del backend:**
   - Asegúrate de que el frontend apunte a `http://localhost:3000`
   
2. **Incluye credenciales:**
   - `credentials: 'include'` en fetch
   - `withCredentials: true` en Axios
   
3. **Verifica el puerto del frontend:**
   - Asegúrate de que tu puerto esté en la lista permitida del backend
   
4. **Reinicia ambos servidores:**
   - Backend: `npm run dev`
   - Frontend: `npm start` o `npm run dev`

## 📞 Soporte

Si sigues teniendo problemas, verifica:
- Los logs del backend mostrarán qué origin está siendo bloqueado
- Usa las herramientas de desarrollador del navegador (Network tab)
- Revisa que no haya proxies o configuraciones adicionales interfiriendo