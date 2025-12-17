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

### Dicas de Segurança

- **NUNCA** commite o arquivo `.env.local` no Git (ele já está no .gitignore)
- As variáveis que começam com `NEXT_PUBLIC_` são expostas no cliente
- Para produção, configure as variáveis de ambiente na plataforma de hospedagem (Vercel, Netlify, etc.)

