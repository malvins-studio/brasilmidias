import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('❌ Erro: NEXT_PUBLIC_FIREBASE_PROJECT_ID não encontrado no .env.local!');
  process.exit(1);
}

// Inicializa Firebase Admin
let app;
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

if (getApps().length === 0) {
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      console.log('🔑 Usando service account key para autenticação');
      console.log(`📋 Project ID da chave: ${serviceAccount.project_id}`);
    } catch (error) {
      console.error('❌ Erro ao ler service account key:', error);
      process.exit(1);
    }
  } else {
    console.error('❌ Service account key não encontrada!');
    console.error('   Baixe a chave do Firebase Console e salve como serviceAccountKey.json');
    process.exit(1);
  }
} else {
  app = getApps()[0];
}

// Especifica o ID do banco de dados (se não for o padrão)
// Se o banco se chama "midiasbrasil", use: getFirestore(app, 'midiasbrasil')
// Se for o banco padrão, use apenas: getFirestore(app)
const db = getFirestore(app, 'midiasbrasil');

// Testa a conexão primeiro
async function testConnection() {
  try {
    console.log('🔍 Testando conexão com Firestore...');
    // Tenta ler uma coleção que não existe (não vai dar erro, só testa a conexão)
    const testRef = db.collection('_test_connection').doc('test');
    await testRef.set({ test: true, timestamp: Timestamp.now() });
    await testRef.delete();
    console.log('✅ Conexão com Firestore estabelecida!\n');
    return true;
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('❌ Erro ao conectar com Firestore:', err.message || String(error));
    console.error('   Código:', err.code);
    
    if (err.code === '5' || err.message?.includes('NOT_FOUND')) {
      console.error('\n💡 Possíveis causas:');
      console.error('   1. O Firestore Database não foi criado no Firebase Console');
      console.error('   2. O Firestore está em modo Datastore (deve ser Native mode)');
      console.error('   3. O projectId está incorreto');
      console.error('\n📋 Verifique:');
      console.error(`   - Acesse: https://console.firebase.google.com/project/${projectId}/firestore`);
      console.error('   - Certifique-se de que o Firestore está criado e em modo Native');
    }
    
    return false;
  }
}

interface Company {
  id: string;
  name: string;
  logo: string;
}

interface Media {
  name: string;
  city: string;
  state: string;
  mediaType: string;
  traffic: number;
  trafficUnit: string;
  pricePerDay: number;
  images: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
  companyId: string;
  companyName: string;
  createdAt: string;
}

interface SeedData {
  companies: Company[];
  media: Media[];
}

async function seedFirebase() {
  try {
    console.log('🌱 Iniciando seed do Firebase...\n');
    console.log(`📋 Projeto: ${projectId}\n`);

    // Testa conexão primeiro
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Lê o arquivo JSON
    const jsonPath = path.resolve(process.cwd(), 'firebase-examples.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Erro: Arquivo firebase-examples.json não encontrado!');
      console.error('   Certifique-se de que o arquivo existe na raiz do projeto.');
      process.exit(1);
    }
    
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as SeedData;

    // 1. Criar empresas
    console.log('📦 Criando empresas...');
    const companyIds: string[] = [];
    
    for (const company of jsonData.companies) {
      try {
        const companyRef = db.collection('companies').doc(company.id);
        await companyRef.set({
          name: company.name,
          logo: company.logo,
          createdAt: Timestamp.now(),
        });
        companyIds.push(company.id);
        console.log(`  ✅ Empresa criada: ${company.name} (ID: ${company.id})`);
      } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        console.error(`  ❌ Erro ao criar empresa ${company.name}:`, err.message || String(error));
        if (err.code) {
          console.error(`     Código: ${err.code}`);
        }
        throw error;
      }
    }

    console.log(`\n✅ ${companyIds.length} empresas criadas com sucesso!\n`);

    // 2. Criar mídias
    console.log('📺 Criando mídias...');
    let mediaCount = 0;

    for (const mediaItem of jsonData.media) {
      // Verifica se a empresa existe
      if (!companyIds.includes(mediaItem.companyId)) {
        console.warn(`  ⚠️  Empresa ${mediaItem.companyId} não encontrada para a mídia ${mediaItem.name}`);
        continue;
      }

      try {
        const mediaRef = db.collection('media').doc();
        const createdAt = mediaItem.createdAt 
          ? Timestamp.fromDate(new Date(mediaItem.createdAt))
          : Timestamp.now();

        await mediaRef.set({
          name: mediaItem.name,
          city: mediaItem.city,
          state: mediaItem.state,
          mediaType: mediaItem.mediaType,
          traffic: mediaItem.traffic,
          trafficUnit: mediaItem.trafficUnit,
          pricePerDay: mediaItem.pricePerDay,
          images: mediaItem.images,
          coordinates: mediaItem.coordinates,
          address: mediaItem.address,
          companyId: mediaItem.companyId,
          companyName: mediaItem.companyName,
          createdAt,
        });

        mediaCount++;
        console.log(`  ✅ Mídia criada: ${mediaItem.name} (ID: ${mediaRef.id})`);
      } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        console.error(`  ❌ Erro ao criar mídia ${mediaItem.name}:`, err.message || String(error));
        if (err.code) {
          console.error(`     Código: ${err.code}`);
        }
        throw error;
      }
    }

    console.log(`\n✅ ${mediaCount} mídias criadas com sucesso!\n`);

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log(`\n📊 Resumo:`);
    console.log(`   - Empresas: ${companyIds.length}`);
    console.log(`   - Mídias: ${mediaCount}`);
    console.log(`\n💡 Dica: Use 'pnpm firebase:clear' para limpar os dados de exemplo.`);
    
  } catch (error) {
    const err = error as { message?: string; code?: string };
    console.error('\n❌ Erro ao fazer seed:', err.message || String(error));
    if (err.code) {
      console.error(`   Código do erro: ${err.code}`);
    }
    process.exit(1);
  }
}

// Executa o seed
seedFirebase().then(() => {
  console.log('\n✨ Processo finalizado!');
  process.exit(0);
});
