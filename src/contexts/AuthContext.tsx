'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

interface SignupData {
  name?: string;
  documentType?: 'cpf' | 'cnpj';
  cpf?: string;
  cnpj?: string;
  phone?: string;
}

interface UpdateUserData {
  name?: string;
  documentType?: 'cpf' | 'cnpj';
  cpf?: string;
  cnpj?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, additionalData?: SignupData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserData: (data: UpdateUserData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  /**
   * Cria uma nova conta e cria o documento do usuário no Firestore
   * O documento é criado com role 'client' por padrão
   * @param additionalData Dados adicionais do usuário (nome, CPF/CNPJ)
   */
  const signup = async (email: string, password: string, additionalData?: SignupData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Cria o documento do usuário no Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // Só cria se não existir (evita sobrescrever se já existir)
    if (!userSnap.exists()) {
      const userData: {
        email: string;
        role: 'client' | 'owner';
        createdAt: Timestamp;
        name?: string;
        documentType?: 'cpf' | 'cnpj';
        cpf?: string;
        cnpj?: string;
        phone?: string;
      } = {
        email: user.email || email,
        role: 'client', // Por padrão, novo usuário é client
        createdAt: Timestamp.now(),
      };

      // Adiciona dados adicionais se fornecidos
      if (additionalData) {
        if (additionalData.name) {
          userData.name = additionalData.name;
        }
        if (additionalData.documentType) {
          userData.documentType = additionalData.documentType;
        }
        if (additionalData.cpf) {
          userData.cpf = additionalData.cpf;
        }
        if (additionalData.cnpj) {
          userData.cnpj = additionalData.cnpj;
        }
        if (additionalData.phone) {
          userData.phone = additionalData.phone;
        }
      }

      await setDoc(userRef, userData);
    }
  };

  /**
   * Login com Google e cria o documento do usuário no Firestore se não existir
   */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Cria o documento do usuário no Firestore se não existir
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email || '',
        name: user.displayName || undefined,
        role: 'client', // Por padrão, novo usuário é client
        createdAt: Timestamp.now(),
      });
    } else {
      // Se o usuário já existe mas não tem nome e o Google forneceu, atualiza
      const userData = userSnap.data();
      if (!userData.name && user.displayName) {
        await updateDoc(userRef, {
          name: user.displayName,
          updatedAt: Timestamp.now(),
        });
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  /**
   * Atualiza a senha do usuário
   * Requer reautenticação com a senha atual
   */
  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) {
      throw new Error('Usuário não autenticado');
    }

    // Reautentica o usuário com a senha atual
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Atualiza a senha
    await updatePassword(user, newPassword);
  };

  /**
   * Atualiza os dados do usuário no Firestore
   * Não permite alterar email (é gerenciado pelo Firebase Auth)
   */
  const updateUserData = async (data: UpdateUserData) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const userRef = doc(db, 'users', user.uid);
    const updateData: {
      updatedAt: Timestamp;
      name?: string | null;
      phone?: string | null;
      documentType?: 'cpf' | 'cnpj';
      cpf?: string | null;
      cnpj?: string | null;
    } = {
      updatedAt: Timestamp.now(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name || null;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone || null;
    }

    // Se está atualizando documento, garante que apenas um tipo existe
    if (data.documentType !== undefined) {
      updateData.documentType = data.documentType;
      
      // Se está definindo CPF, remove CNPJ
      if (data.documentType === 'cpf') {
        updateData.cnpj = null;
        if (data.cpf !== undefined) {
          updateData.cpf = data.cpf || null;
        }
      }
      // Se está definindo CNPJ, remove CPF
      else if (data.documentType === 'cnpj') {
        updateData.cpf = null;
        if (data.cnpj !== undefined) {
          updateData.cnpj = data.cnpj || null;
        }
      }
    } else {
      // Se não está definindo documentType, atualiza apenas o que foi fornecido
      if (data.cpf !== undefined) {
        updateData.cpf = data.cpf || null;
        // Se está atualizando CPF, remove CNPJ
        if (data.cpf) {
          updateData.cnpj = null;
          updateData.documentType = 'cpf';
        }
      }

      if (data.cnpj !== undefined) {
        updateData.cnpj = data.cnpj || null;
        // Se está atualizando CNPJ, remove CPF
        if (data.cnpj) {
          updateData.cpf = null;
          updateData.documentType = 'cnpj';
        }
      }
    }

    await updateDoc(userRef, updateData);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signup, 
      loginWithGoogle, 
      logout,
      updateUserPassword,
      updateUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

