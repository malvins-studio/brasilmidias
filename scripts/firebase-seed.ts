import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Verifica se as variáveis estão configuradas
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Erro: Variáveis de ambiente do Firebase não encontradas!');
  console.error('Certifique-se de que o arquivo .env.local existe e está configurado.');
  process.exit(1);
}

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
      const companyRef = doc(collection(db, 'companies'), company.id);
      await setDoc(companyRef, {
        name: company.name,
        logo: company.logo,
      });
      companyIds.push(company.id);
      console.log(`  ✅ Empresa criada: ${company.name} (ID: ${company.id})`);
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

      const mediaRef = doc(collection(db, 'media'));
      const createdAt = mediaItem.createdAt 
        ? Timestamp.fromDate(new Date(mediaItem.createdAt))
        : Timestamp.now();

      await setDoc(mediaRef, {
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

