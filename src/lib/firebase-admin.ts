import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;

/**
 * Inicializa o Firebase Admin SDK
 * Reutiliza a instância se já foi inicializada
 */
export function getFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID não encontrado nas variáveis de ambiente');
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error('serviceAccountKey.json não encontrado. Baixe a chave do Firebase Console.');
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });

    return adminApp;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
    throw new Error('Falha ao inicializar Firebase Admin SDK');
  }
}

/**
 * Retorna a instância do Auth do Firebase Admin
 */
export function getAdminAuth() {
  const app = getFirebaseAdmin();
  return getAuth(app);
}

