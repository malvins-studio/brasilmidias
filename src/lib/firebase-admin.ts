import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;

/**
 * Obtém as credenciais do Firebase Admin de variáveis de ambiente ou arquivo
 * Tenta primeiro o arquivo (desenvolvimento local), depois variáveis de ambiente individuais,
 * e por último a variável JSON completa
 */
function getServiceAccount() {
  // Primeiro, tenta ler do arquivo (desenvolvimento local)
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    try {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    } catch (error) {
      console.error('Erro ao ler serviceAccountKey.json:', error);
      // Continua para tentar variáveis de ambiente
    }
  }

  // Se não encontrou o arquivo, tenta variáveis de ambiente individuais
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Reutiliza o project_id do Client SDK se disponível, senão usa FIREBASE_PROJECT_ID
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (privateKey && clientEmail && projectId) {
    return {
      type: 'service_account',
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      universe_domain: 'googleapis.com',
    };
  }

  // Por último, tenta a variável JSON completa (FIREBASE_SERVICE_ACCOUNT)
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountEnv) {
    try {
      return JSON.parse(serviceAccountEnv);
    } catch (error) {
      console.error('Erro ao fazer parse do FIREBASE_SERVICE_ACCOUNT:', error);
      throw new Error('FIREBASE_SERVICE_ACCOUNT inválido nas variáveis de ambiente');
    }
  }

  // Se nenhuma opção funcionou, lança erro
  throw new Error(
    'Credenciais do Firebase não encontradas. ' +
    'Opções: 1) Arquivo serviceAccountKey.json na raiz do projeto (desenvolvimento), ' +
    '2) Variáveis de ambiente individuais (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID), ' +
    '3) Variável FIREBASE_SERVICE_ACCOUNT com JSON completo (produção).'
  );
}

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

  try {
    const serviceAccount = getServiceAccount();
    
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

