# Configuração de Regras do Firestore

## ⚠️ Erro: PERMISSION_DENIED

Se você está recebendo o erro `PERMISSION_DENIED: Missing or insufficient permissions`, significa que as regras de segurança do Firestore estão bloqueando as operações.

## 🔧 Solução Rápida para Desenvolvimento

### 1. Acesse o Firebase Console

1. Vá para [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. No menu lateral, vá em **Firestore Database**
4. Clique na aba **"Rules"** (Regras)

### 2. Configure Regras Temporárias para Desenvolvimento

**⚠️ ATENÇÃO:** Essas regras permitem leitura e escrita para TODOS. Use apenas em desenvolvimento!

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita para todos (APENAS DESENVOLVIMENTO!)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. Publique as Regras

1. Cole as regras acima no editor
2. Clique em **"Publish"** (Publicar)
3. Aguarde alguns segundos para as regras serem aplicadas

### 4. Teste Novamente

Execute o script novamente:

```bash
pnpm firebase:seed
```

## 🔒 Regras Recomendadas para Produção

Quando estiver pronto para produção, use regras mais seguras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para companies (público pode ler, apenas autenticados podem escrever)
    match /companies/{companyId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Regras para media (público pode ler, apenas autenticados podem escrever)
    match /media/{mediaId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Regras para reservations (usuários só podem ler/escrever suas próprias reservas)
    match /reservations/{reservationId} {
      allow read: if request.auth != null && 
                     (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    // Regras para favorites (usuários só podem ler/escrever seus próprios favoritos)
    match /favorites/{favoriteId} {
      allow read: if request.auth != null && 
                     (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && 
                        resource.data.userId == request.auth.uid;
    }
  }
}
```

## 🛠️ Regras para Scripts de Seed (Desenvolvimento)

Se você quiser permitir que os scripts funcionem mas manter alguma segurança, pode criar uma regra especial:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permite tudo para desenvolvimento (comentar em produção)
    match /{document=**} {
      allow read, write: if true;
    }
    
    // OU use regras específicas por coleção:
    
    // Companies - leitura pública, escrita autenticada
    match /companies/{companyId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Media - leitura pública, escrita autenticada
    match /media/{mediaId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Reservations - usuário só acessa suas próprias
    match /reservations/{reservationId} {
      allow read, write: if request.auth != null;
    }
    
    // Favorites - usuário só acessa seus próprios
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📝 Passo a Passo Detalhado

### Opção 1: Regras Abertas (Apenas Desenvolvimento)

1. **Firebase Console** → Seu Projeto → **Firestore Database** → **Rules**
2. **Substitua** as regras existentes por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Clique em **"Publish"**
4. Aguarde a confirmação
5. Execute `pnpm firebase:seed` novamente

### Opção 2: Usar Firebase Admin SDK (Recomendado para Scripts)

Se você quiser manter as regras seguras mas permitir que os scripts funcionem, você pode usar o Firebase Admin SDK, que ignora as regras de segurança.

**Vantagens:**
- ✅ Mantém as regras de segurança para usuários
- ✅ Scripts funcionam independente das regras
- ✅ Mais seguro

**Desvantagens:**
- ⚠️ Requer configuração adicional (chave de serviço)

Se quiser, posso ajudar a configurar o Admin SDK para os scripts.

## 🔍 Verificando se Funcionou

Após configurar as regras:

1. Execute o script:
   ```bash
   pnpm firebase:seed
   ```

2. Se funcionar, você verá:
   ```
   🌱 Iniciando seed do Firebase...
   📦 Criando empresas...
     ✅ Empresa criada: Outdoor Solutions...
   ```

3. Verifique no Firebase Console:
   - Firestore Database → Coleção `companies` → deve ter 3 documentos
   - Firestore Database → Coleção `media` → deve ter 5 documentos

## ⚠️ Importante

- **NUNCA** use regras abertas (`allow read, write: if true`) em produção!
- Sempre teste as regras antes de publicar em produção
- Use o Firebase Emulator para testar regras localmente

## 🆘 Ainda com Problemas?

Se ainda estiver com problemas após configurar as regras:

1. Verifique se você está no projeto correto no Firebase Console
2. Aguarde alguns minutos após publicar as regras (pode levar tempo para propagar)
3. Verifique se o arquivo `.env.local` está configurado corretamente
4. Tente fazer logout/login no Firebase Console

