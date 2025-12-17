# Scripts do Firebase

Scripts para gerenciar dados de exemplo no Firebase.

## 📋 Requisitos

1. Arquivo `.env.local` configurado com as credenciais do Firebase
2. Firebase Firestore configurado e ativo
3. Arquivo `firebase-examples.json` na raiz do projeto

## 🚀 Scripts Disponíveis

### 1. Seed (Popular dados)

Cria os dados de exemplo no Firebase baseado no arquivo `firebase-examples.json`.

```bash
pnpm firebase:seed
```

**O que faz:**
- ✅ Cria 3 empresas na coleção `companies` com IDs específicos:
  - `outdoor-solutions`
  - `midia-urbana-sp`
  - `publicidade-express`
- ✅ Cria 5 mídias na coleção `media` vinculadas às empresas
- ✅ Usa os dados do arquivo `firebase-examples.json`

**Exemplo de saída:**
```
🌱 Iniciando seed do Firebase...

📦 Criando empresas...
  ✅ Empresa criada: Outdoor Solutions (ID: outdoor-solutions)
  ✅ Empresa criada: Mídia Urbana SP (ID: midia-urbana-sp)
  ✅ Empresa criada: Publicidade Express (ID: publicidade-express)

✅ 3 empresas criadas com sucesso!

📺 Criando mídias...
  ✅ Mídia criada: Outdoor Avenida Paulista - Sentido Centro (ID: abc123...)
  ✅ Mídia criada: Busdoor Ônibus Linha Vermelha - Zona Norte (ID: def456...)
  ...

🎉 Seed concluído com sucesso!
```

### 2. Clear (Limpar dados)

Remove os dados de exemplo do Firebase.

```bash
# Limpar apenas dados de exemplo
pnpm firebase:clear

# Limpar TUDO (incluindo empresas não-exemplo)
pnpm firebase:clear:all
```

**Modo padrão (`firebase:clear`):**
- 🗑️ Deleta as 3 empresas de exemplo (pelos IDs específicos)
- 🗑️ Deleta todas as mídias que pertencem a essas empresas (filtradas por `companyId`)
- 🗑️ Deleta **TODAS** as reservas da coleção `reservations`
- 🗑️ Deleta **TODOS** os favoritos da coleção `favorites`
- ℹ️ Mostra quais empresas ainda restam (se houver)

**Modo `--all` (`firebase:clear:all`):**
- 🗑️ Deleta **TODAS** as empresas
- 🗑️ Deleta **TODAS** as mídias
- 🗑️ Deleta **TODAS** as reservas
- 🗑️ Deleta **TODOS** os favoritos

**⚠️ Atenção:** 
- O script de clear remove TODAS as reservas e favoritos, não apenas os de exemplo
- Use `--all` com cuidado, pois deleta tudo sem exceção!

**Exemplo de saída:**
```
🧹 Iniciando limpeza do Firebase...

⚠️  ATENÇÃO: Isso vai deletar os dados de exemplo!
   - Empresas de exemplo (outdoor-solutions, midia-urbana-sp, publicidade-express)
   - Mídias que pertencem a essas empresas
   - TODAS as reservas
   - TODOS os favoritos

🗑️  Limpando coleção: media...
  ✅ Deletado: abc123...
  ✅ Deletado: def456...
  ✅ 5 documentos deletados da coleção media

🗑️  Limpando empresas de exemplo...
  ✅ Empresa deletada: outdoor-solutions
  ✅ Empresa deletada: midia-urbana-sp
  ✅ Empresa deletada: publicidade-express

✅ Limpeza concluída!
```

## 📝 Exemplo de Uso Completo

```bash
# 1. Popular o banco com dados de exemplo
pnpm firebase:seed

# 2. Testar a aplicação com os dados

# 3. Limpar apenas os dados de exemplo
pnpm firebase:clear

# OU limpar TUDO (se necessário)
pnpm firebase:clear:all

# 4. Popular novamente se quiser
pnpm firebase:seed
```

## 🔍 Verificando os Dados

Após executar o seed, você pode verificar os dados no [Firebase Console](https://console.firebase.google.com/):

1. Acesse o Firestore Database
2. Verifique as coleções:
   - `companies` - deve ter 3 documentos
   - `media` - deve ter 5 documentos

## ⚙️ Configuração

### Arquivo `.env.local`

Certifique-se de que o arquivo `.env.local` está configurado:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_chave
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

### Arquivo `firebase-examples.json`

O arquivo deve estar na raiz do projeto e conter a estrutura:

```json
{
  "companies": [...],
  "media": [...]
}
```

## 🐛 Solução de Problemas

### Erro: "Variáveis de ambiente do Firebase não encontradas"
- Verifique se o arquivo `.env.local` existe na raiz do projeto
- Verifique se todas as variáveis estão preenchidas

### Erro: "Arquivo firebase-examples.json não encontrado"
- Verifique se o arquivo existe na raiz do projeto
- Verifique se o nome do arquivo está correto

### Erro de permissão no Firestore
- Verifique as regras de segurança do Firestore
- Para desenvolvimento, você pode usar regras temporárias:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```
  ⚠️ **ATENÇÃO:** Essas regras são apenas para desenvolvimento! Não use em produção!

## 📚 Notas Importantes

- ✅ O script de seed cria as empresas com IDs específicos para facilitar a limpeza
- ✅ O script de clear só remove dados relacionados aos exemplos (empresas e mídias)
- ⚠️ O script de clear remove **TODAS** as reservas e favoritos
- ✅ Dados criados manualmente que não sejam dos exemplos não serão removidos pelo clear (exceto reservas e favoritos)
- ✅ Você pode executar o seed múltiplas vezes - ele vai sobrescrever os dados existentes
