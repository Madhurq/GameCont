import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userId: string | null;
  username: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (token: string, userId: string, username: string, email: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  username: null,
  email: null,
  isAuthenticated: false,

  login: (token, userId, username, email) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
    set({ token, userId, username, email, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    set({ token: null, userId: null, username: null, email: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    if (token && userId) {
      set({ token, userId, username, email, isAuthenticated: true });
    }
  },
}));
