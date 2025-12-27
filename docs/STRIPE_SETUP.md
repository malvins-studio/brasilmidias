# Configuração do Stripe

Este documento explica como configurar o Stripe para pagamentos na plataforma.

## Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Como obter as chaves:

1. **STRIPE_SECRET_KEY** e **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**:
   - Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
   - Vá em **Developers** → **API keys**
   - Use as chaves de teste (test keys) para desenvolvimento
   - Use as chaves de produção (live keys) para produção

2. **STRIPE_WEBHOOK_SECRET**:
   - No Stripe Dashboard, vá em **Developers** → **Webhooks**
   - Clique em **Add endpoint**
   - URL: `https://seu-dominio.com/api/stripe/webhook`
   - Selecione os eventos: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copie o **Signing secret** (começa com `whsec_`)

## Configuração do Stripe Connect

A plataforma suporta split automático de pagamentos usando Stripe Connect. Os owners podem criar e gerenciar suas contas Stripe diretamente pelo dashboard.

### Para Owners:

1. Acesse o dashboard do owner (`/owner/dashboard`)
2. Na seção "Conta Stripe Connect", clique em "Criar Conta Stripe Connect"
3. Complete o processo de onboarding na Stripe
4. Após completar, sua conta estará configurada e você receberá pagamentos automaticamente

### Como funciona:

- **Split Automático**: Quando um owner tem uma conta Stripe Connect configurada, o pagamento é dividido automaticamente no momento do checkout
  - **Plataforma**: Recebe 15% (taxa configurável)
  - **Owner**: Recebe 85% automaticamente na conta Stripe Connect

- **Sem Conta Stripe Connect**: O pagamento vai 100% para a plataforma e pode ser transferido manualmente depois

### APIs Disponíveis:

- `POST /api/stripe/connect/create-account` - Cria uma conta Stripe Connect para o owner
- `POST /api/stripe/connect/onboarding` - Gera link de onboarding
- `POST /api/stripe/connect/login` - Gera link de login no dashboard Stripe
- `GET /api/stripe/connect/account-status` - Verifica status da conta

### Configuração no Stripe Dashboard:

1. Ative o Stripe Connect no seu dashboard Stripe
2. Configure o tipo de conta: **Express** (recomendado para owners)
3. Configure as capabilities: `card_payments` e `transfers`

## Fluxo de Pagamento

### Com Stripe Connect (Split Automático):

1. **Checkout**: Usuário clica em "Ir para Pagamento" e é redirecionado para o Stripe Checkout
2. **Split Automático**: No momento do pagamento:
   - 15% vai automaticamente para a plataforma (application_fee)
   - 85% vai automaticamente para a conta Stripe Connect do owner
3. **Pagamento Confirmado**: O pagamento é confirmado e o dinheiro já está na conta do owner

### Sem Stripe Connect (Fluxo Manual):

1. **Checkout**: Usuário clica em "Ir para Pagamento" e é redirecionado para o Stripe Checkout
2. **Pagamento Bloqueado**: Após o pagamento ser confirmado, o valor fica bloqueado na conta da plataforma
3. **Liberação**: Ao final do período de aluguel, o admin/usuário pode liberar o pagamento
4. **Transferência Manual**: Se o owner tiver uma conta Stripe Connect, o valor é transferido manualmente via API

## Porcentagem da Plataforma

A porcentagem da plataforma está configurada em `src/app/api/stripe/checkout/route.ts`:

```typescript
const PLATFORM_FEE_PERCENTAGE = 15; // 15%
```

Você pode ajustar este valor conforme necessário.

## Testando

Use os cartões de teste do Stripe:
- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- Use qualquer data futura para expiração e qualquer CVC

Mais informações: https://stripe.com/docs/testing

