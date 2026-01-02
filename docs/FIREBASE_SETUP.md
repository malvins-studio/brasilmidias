# Guia de Configuração do Firebase

## Passo a Passo para Configurar o Firebase

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto" ou "Add project"
3. Digite o nome do projeto (ex: "midiasbrasil")
4. Siga os passos de criação do projeto

### 2. Obter as Credenciais do Firebase

1. No Firebase Console, vá em **Project Settings** (ícone de engrenagem no canto superior esquerdo)
2. Role até a seção **"Your apps"**
3. Se ainda não tiver um app web, clique no ícone **`</>`** (Web) ou em **"Add app"**
4. Registre o app com um nome (ex: "midiasbrasil-web")
5. Você verá um objeto JavaScript com as configurações, algo assim:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC-exemplo-de-chave-api",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```
x
### 3. Criar o arquivo .env.local

1. Na raiz do projeto, crie um arquivo chamado `.env.local`
2. Copie o conteúdo do arquivo `.env.local.example` e preencha com seus valores:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC-exemplo-de-chave-api
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

**Importante:** Substitua os valores pelos seus valores reais do Firebase!

### 4. Configurar Authentication

1. No Firebase Console, vá em **Authentication** (Build > Authentication)
2. Clique em **"Get started"** se for a primeira vez
3. Vá na aba **"Sign-in method"**
4. Habilite:
   - **Email/Password** (Email/Password)
   - **Google** (adicione o email de suporte do projeto se solicitado)

### 5. Criar as Coleções no Firestore

1. No Firebase Console, vá em **Firestore Database** (Build > Firestore Database)
2. Clique em **"Create database"** se for a primeira vez
3. Escolha **"Start in test mode"** (você pode configurar regras depois)
4. Escolha a localização do banco (ex: us-central1)
5. Após criar, você precisará criar as seguintes coleções manualmente ou através de código:

   - `media`
   - `reservations`
   - `favorites`
   - `companies`

### 6. Exemplo de Dados para Teste

Você pode adicionar dados de exemplo diretamente no Firestore Console ou usar este formato JSON:

**Coleção `companies`:**
```json
{
  "name": "Empresa Exemplo",
  "logo": "https://exemplo.com/logo.png"
}
```

**Coleção `media`:**
```json
{
  "name": "Outdoor Avenida Paulista",
  "city": "São Paulo",
  "state": "SP",
  "mediaType": "Outdoor",
  "traffic": 50000,
  "trafficUnit": "veículos/dia",
  "pricePerDay": 500.00,
  "images": [
    "https://exemplo.com/imagem1.jpg",
    "https://exemplo.com/imagem2.jpg",
    "https://exemplo.com/imagem3.jpg"
  ],
  "coordinates": {
    "lat": -23.5505,
    "lng": -46.6333
  },
  "address": {
    "street": "Avenida Paulista",
    "number": "1000",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  },
  "companyId": "id-da-empresa",
  "companyName": "Empresa Exemplo",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 7. Testar a Aplicação

1. Certifique-se de que o arquivo `.env.local` está na raiz do projeto
2. Reinicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```
3. Acesse `http://localhost:3000`

### 8. Configurar Firebase Admin SDK (Service Account)

Para usar o Firebase Admin SDK (necessário para algumas operações no servidor), você precisa de uma Service Account:

#### Desenvolvimento Local

1. No Firebase Console, vá em **Project Settings** > **Service accounts**
2. Clique em **"Generate new private key"**
3. Salve o arquivo JSON como `serviceAccountKey.json` na raiz do projeto
4. **IMPORTANTE:** Este arquivo já está no `.gitignore` e NÃO deve ser commitado

#### Produção (Vercel)

No Vercel, você tem **duas opções** para configurar as credenciais. O código tenta primeiro o arquivo (que não existe no Vercel), depois as variáveis de ambiente:

##### Opção 1: Variáveis de Ambiente Individuais (Recomendado)

Esta é a forma mais simples e organizada:

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis (uma por vez):

   - **Name:** `FIREBASE_PROJECT_ID`  
     **Value:** O ID do seu projeto (ex: `brasilmidias-com-br`)

   - **Name:** `FIREBASE_CLIENT_EMAIL`  
     **Value:** O email da service account (ex: `firebase-adminsdk-xxx@projeto.iam.gserviceaccount.com`)

   - **Name:** `FIREBASE_PRIVATE_KEY`  
     **Value:** A chave privada completa, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`  
     **Importante:** Cole a chave exatamente como está, com as quebras de linha `\n` ou deixe o Vercel processar automaticamente

   - **Name:** `FIREBASE_PRIVATE_KEY_ID` (opcional)  
     **Value:** O ID da chave privada

   - **Name:** `FIREBASE_CLIENT_ID` (opcional)  
     **Value:** O client ID

4. Para cada variável, selecione **Production, Preview e Development**
5. Clique em **Save** para cada uma

**Como obter os valores:**
Abra o arquivo `serviceAccountKey.json` localmente e copie os valores correspondentes de cada campo.

##### Opção 2: Variável JSON Completa

Alternativamente, você pode usar uma única variável com o JSON completo:

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** > **Environment Variables**
3. Adicione uma nova variável:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** O conteúdo completo do arquivo `serviceAccountKey.json` (todo o JSON em uma linha)
   - **Environments:** Selecione Production, Preview e Development
4. Clique em **Save**

**Como obter o valor:**
```bash
cat serviceAccountKey.json | jq -c
```

Ou copie manualmente o conteúdo do arquivo e remova todas as quebras de linha.

**Recomendação:** Use a **Opção 1** (variáveis individuais) pois é mais fácil de gerenciar e visualizar no Vercel.

### Dicas de Segurança

- **NUNCA** commite o arquivo `serviceAccountKey.json` no Git (ele já está no .gitignore)
- **NUNCA** commite o arquivo `.env.local` no Git (ele já está no .gitignore)
- As variáveis que começam com `NEXT_PUBLIC_` são expostas no cliente
- Para produção, configure as variáveis de ambiente na plataforma de hospedagem (Vercel, Netlify, etc.)
- A variável `FIREBASE_SERVICE_ACCOUNT` contém credenciais sensíveis - mantenha-a segura

