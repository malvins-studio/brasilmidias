# Mídias Brasil - Plataforma de Locação de Mídias Outdoor

MVP de uma plataforma de locação de mídias outdoor, similar ao Airbnb.

## Funcionalidades

- ✅ Autenticação com email/senha e Google OAuth
- ✅ Listagem de mídias com filtros por cidade e data
- ✅ Sistema de favoritos
- ✅ Sistema de reservas com verificação de disponibilidade
- ✅ Página de detalhes da mídia com galeria de imagens
- ✅ Cálculo dinâmico de preço baseado em dias selecionados
- ✅ Indicadores visuais para mídias reservadas

## Tecnologias

- Next.js 16
- React 19
- TypeScript
- Firebase (Auth, Firestore, Storage)
- Tailwind CSS
- shadcn/ui

## Configuração

1. Instale as dependências:
```bash
pnpm install
```

2. Configure as variáveis de ambiente do Firebase. Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Configure o Firebase:
   - Crie um projeto no Firebase Console
   - Ative Authentication (Email/Password e Google)
   - Crie as coleções no Firestore:
     - `media`
     - `reservations`
     - `favorites`
     - `companies`

4. Execute o servidor de desenvolvimento:
```bash
pnpm dev
```

## Estrutura de Dados

### Coleção `media`
```typescript
{
  name: string
  city: string
  state: string
  mediaType: string
  traffic: number
  trafficUnit: string
  pricePerDay: number
  images: string[]
  coordinates: { lat: number, lng: number }
  address: {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
    complement?: string
  }
  companyId: string
  companyName: string
  createdAt: Timestamp
}
```

### Coleção `reservations`
```typescript
{
  mediaId: string
  userId: string
  startDate: Timestamp
  endDate: Timestamp
  totalPrice: number
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: Timestamp
}
```

### Coleção `favorites`
```typescript
{
  userId: string
  mediaId: string
  createdAt: Timestamp
}
```

### Coleção `companies`
```typescript
{
  name: string
  logo: string
}
```

## Rotas

- `/` - Página inicial com listagem de mídias
- `/login` - Página de login/cadastro
- `/midia/[id]` - Página de detalhes da mídia

## Scripts

- `pnpm dev` - Inicia o servidor de desenvolvimento
- `pnpm build` - Cria build de produção
- `pnpm start` - Inicia o servidor de produção
- `pnpm lint` - Executa o linter
