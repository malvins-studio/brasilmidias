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

## Configuração do Stripe Connect (Opcional)

Para fazer split de pagamento com os owners das mídias:

1. Ative o Stripe Connect no seu dashboard
2. Configure cada owner com uma conta Stripe Connect
3. Adicione o `ownerStripeAccountId` no documento da mídia no Firestore

### Exemplo de documento de mídia:

```typescript
{
  // ... outros campos
  ownerStripeAccountId: "acct_1234567890" // ID da conta Stripe Connect do owner
}
```

## Fluxo de Pagamento

1. **Checkout**: Usuário clica em "Ir para Pagamento" e é redirecionado para o Stripe Checkout
2. **Pagamento Bloqueado**: Após o pagamento ser confirmado, o valor fica bloqueado na conta da plataforma
3. **Liberação**: Ao final do período de aluguel, o admin/usuário pode liberar o pagamento
4. **Split**: Se o owner tiver uma conta Stripe Connect, o valor é transferido automaticamente

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

