import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from "firebase/auth";
import { allowedAdminEmails, auth, isFirebaseConfigured } from "../firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const isAdmin = Boolean(
    user && (allowedAdminEmails.length === 0 || allowedAdminEmails.includes(user.email?.toLowerCase() ?? ""))
  );

  async function signIn(email: string, password: string) {
    if (!auth || !isFirebaseConfigured) {
      throw new Error("Firebase Auth no esta configurado. Revisa las variables de entorno VITE_FIREBASE_*.");
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const normalizedEmail = credential.user.email?.toLowerCase() ?? "";

    if (allowedAdminEmails.length > 0 && !allowedAdminEmails.includes(normalizedEmail)) {
      await signOut(auth);
      throw new Error("Este usuario inicio sesion, pero no figura en VITE_ADMIN_ALLOWED_EMAILS.");
    }
  }

  async function signOutUser() {
    if (!auth) {
      return;
    }

    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isConfigured: isFirebaseConfigured,
        signIn,
        signOutUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
