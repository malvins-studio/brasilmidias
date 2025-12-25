import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  where,
  getDoc,
  DocumentReference
} from 'firebase/firestore';
import dotenv from 'dotenv';
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

// IDs das empresas de exemplo (do firebase-examples.json)
const EXAMPLE_COMPANY_IDS = [
  'outdoor-solutions',
  'midia-urbana-sp',
  'publicidade-express',
];

async function clearCollection(collectionName: string, filterByCompanyIds = false) {
  try {
    console.log(`\nLimpando coleção: ${collectionName}...`);

    const q = query(collection(db, collectionName));
    
    // Se for a coleção de mídias, filtra apenas as mídias das empresas de exemplo
    if (filterByCompanyIds && collectionName === 'media') {
      // Busca mídias que pertencem às empresas de exemplo
      const allDocs: { id: string; ref: DocumentReference }[] = [];
      for (const companyId of EXAMPLE_COMPANY_IDS) {
        const companyQuery = query(
          collection(db, collectionName),
          where('companyId', '==', companyId)
        );
        const snapshot = await getDocs(companyQuery);
        snapshot.forEach((doc) => {
          allDocs.push({ id: doc.id, ref: doc.ref });
        });
      }

      // Deleta as mídias encontradas
      for (const docItem of allDocs) {
        await deleteDoc(docItem.ref);
        console.log(`Deletado: ${docItem.id}`);
      }

      console.log(`${allDocs.length} documentos deletados da coleção ${collectionName}`);
      return allDocs.length;
    } else {
      // Para outras coleções, deleta todos os documentos
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(async (docSnapshot) => {
        await deleteDoc(docSnapshot.ref);
        console.log(`Deletado: ${docSnapshot.id}`);
      });

      await Promise.all(deletePromises);
      console.log(`${snapshot.docs.length} documentos deletados da coleção ${collectionName}`);
      return snapshot.docs.length;
    }
  } catch (error) {
    console.error(`Erro ao limpar ${collectionName}:`, error);
    return 0;
  }
}

async function clearFirebase() {
  try {
    // Verifica se deve deletar tudo ou apenas exemplos
    const deleteAll = process.argv.includes('--all');
    
    console.log('Iniciando limpeza do Firebase...\n');
    
    if (deleteAll) {
      console.log('ATENÇÃO: Modo --all ativado! Isso vai deletar TUDO!');
      console.log('   - TODAS as empresas');
      console.log('   - TODAS as mídias');
      console.log('   - TODAS as reservas');
      console.log('   - TODOS os favoritos\n');
    } else {
      console.log('ATENÇÃO: Isso vai deletar os dados de exemplo!');
      console.log('   - Empresas de exemplo (outdoor-solutions, midia-urbana-sp, publicidade-express)');
      console.log('   - Mídias que pertencem a essas empresas');
      console.log('   - TODAS as reservas');
      console.log('   - TODOS os favoritos');
      console.log('\nUse --all para deletar TUDO (incluindo empresas não-exemplo)\n');
    }

    let totalDeleted = 0;

    // 1. Deletar mídias
    let mediaCount = 0;
    if (deleteAll) {
      // Deleta TODAS as mídias
      mediaCount = await clearCollection('media', false);
    } else {
      // Deleta apenas mídias de exemplo (filtradas por companyId)
      mediaCount = await clearCollection('media', true);
    }
    totalDeleted += mediaCount;

    // 2. Deletar empresas
    let companiesDeleted = 0;
    
    if (deleteAll) {
      // Deleta TODAS as empresas
      console.log(`\n Limpando TODAS as empresas...`);
      const allCompaniesSnapshot = await getDocs(collection(db, 'companies'));
      for (const docSnap of allCompaniesSnapshot.docs) {
        try {
          await deleteDoc(docSnap.ref);
          console.log(`Empresa deletada: ${docSnap.id} (${docSnap.data().name || 'sem nome'})`);
          companiesDeleted++;
          totalDeleted++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Erro ao deletar empresa ${docSnap.id}:`, errorMessage);
        }
      }
    } else {
      // Deleta apenas empresas de exemplo
      console.log(`\n Limpando empresas de exemplo...`);
      for (const companyId of EXAMPLE_COMPANY_IDS) {
        const companyRef = doc(db, 'companies', companyId);
        try {
          // Verifica se o documento existe antes de deletar
          const companySnap = await getDoc(companyRef);
          if (companySnap.exists()) {
            await deleteDoc(companyRef);
            console.log(`Empresa deletada: ${companyId}`);
            companiesDeleted++;
            totalDeleted++;
          } else {
            console.log(`  Empresa não encontrada: ${companyId} (já foi deletada ou não existe)`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Erro ao deletar empresa ${companyId}:`, errorMessage);
          // Continua tentando deletar as outras empresas mesmo se uma falhar
        }
      }
      
      // Se ainda houver empresas restantes, lista elas
      const allCompaniesSnapshot = await getDocs(collection(db, 'companies'));
      if (allCompaniesSnapshot.size > 0) {
        console.log(`\nAinda existem ${allCompaniesSnapshot.size} empresa(s) na coleção:`);
        allCompaniesSnapshot.forEach((docSnap) => {
          console.log(`   - ${docSnap.id} (${docSnap.data().name || 'sem nome'})`);
        });
        console.log(`\nDica: Execute 'pnpm firebase:clear --all' para deletar TODAS as empresas`);
      }
    }

    // 3. Deletar todas as reservas
    const reservationsCount = await clearCollection('reservations');
    totalDeleted += reservationsCount;

    // 4. Deletar todos os favoritos
    const favoritesCount = await clearCollection('favorites');
    totalDeleted += favoritesCount;

    console.log('\nLimpeza concluída!');
    console.log(`\nResumo:`);
    console.log(`- Total de documentos deletados: ${totalDeleted}`);
    console.log(`* Empresas deletadas: ${companiesDeleted} de ${EXAMPLE_COMPANY_IDS.length}`);
    console.log(`* Mídias: ${mediaCount}`);
    console.log(`* Reservas: ${reservationsCount}`);
    console.log(`* Favoritos: ${favoritesCount}`);

  } catch (error) {
    console.error('Erro ao limpar Firebase:', error);
    process.exit(1);
  }
}

// Executa a limpeza
clearFirebase().then(() => {
  console.log('\nProcesso finalizado!');
  process.exit(0);
});

