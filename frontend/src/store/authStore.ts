import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

interface User {
  id: number;
  name: string;
  email: string;
  business_name?: string;
  token: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, business_name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const API_URL = 'http://localhost:5000/api';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }
      
      // Guardar token de forma segura
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data));
      
      set({ user: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      Alert.alert('Error', error.message);
    }
  },

  register: async (name: string, email: string, password: string, business_name?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, business_name }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar usuario');
      }
      
      // Guardar token de forma segura
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data));
      
      set({ user: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      Alert.alert('Error', error.message);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      set({ user: null });
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      const token = await SecureStore.getItemAsync('token');
      const userJson = await SecureStore.getItemAsync('user');
      
      if (token && userJson) {
        const user = JSON.parse(userJson);
        
        // Validar el token con el servidor
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          set({ user, isLoading: false });
          return;
        }
      }
      
      // Si llegamos aquí, el token no es válido o no existe
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },
}));