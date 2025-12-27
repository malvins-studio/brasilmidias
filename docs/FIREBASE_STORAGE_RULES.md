# Configuração de Regras do Firebase Storage

## ⚠️ Importante

Para que o upload de imagens funcione, você precisa configurar as regras de segurança do Firebase Storage.

## 🔧 Configurar Regras do Storage

### 1. Acesse o Firebase Console

1. Vá para [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. No menu lateral, vá em **Storage** (Build > Storage)
4. Clique na aba **"Rules"** (Regras)

### 2. Regras para Desenvolvimento

**⚠️ ATENÇÃO:** Essas regras permitem leitura e escrita para usuários autenticados. Use apenas em desenvolvimento!

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permite upload e leitura de imagens de mídia para usuários autenticados
    match /media-images/{imageId} {
      allow read: if true; // Qualquer um pode ler (imagens públicas)
      allow write: if request.auth != null; // Apenas usuários autenticados podem fazer upload
      allow delete: if request.auth != null; // Apenas usuários autenticados podem deletar
    }
  }
}
```

### 3. Regras Recomendadas para Produção

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Imagens de mídia
    match /media-images/{imageId} {
      // Qualquer um pode ler (imagens são públicas)
      allow read: if true;
      
      // Apenas usuários autenticados podem fazer upload
      allow write: if request.auth != null 
                     && request.resource.size < 5 * 1024 * 1024 // Máximo 5MB
                     && request.resource.contentType.matches('image/.*');
      
      // Apenas usuários autenticados podem deletar
      allow delete: if request.auth != null;
    }
  }
}
```

### 4. Publique as Regras

1. Cole as regras acima no editor
2. Clique em **"Publish"** (Publicar)
3. Aguarde alguns segundos para as regras serem aplicadas

## 📋 Estrutura de Pastas no Storage

As imagens serão salvas na seguinte estrutura:

```
media-images/
  ├── 1234567890_imagem1.jpg
  ├── 1234567891_imagem2.png
  └── ...
```

Onde:
- `media-images/` é a pasta raiz para imagens de mídia
- O nome do arquivo é: `{timestamp}_{nome_original}` para evitar conflitos

## 🔍 Verificando se Funcionou

1. Acesse a página de criação/edição de mídia
2. Tente fazer upload de uma imagem
3. Verifique no Firebase Console → Storage se a imagem foi salva

## 🐛 Solução de Problemas

### Erro: "User does not have permission to access this object"

**Causa:** As regras do Storage estão bloqueando o acesso.

**Solução:**
1. Verifique se as regras do Storage estão publicadas
2. Certifique-se de que o usuário está autenticado
3. Use as regras de desenvolvimento temporariamente para testar

### Erro: "Storage bucket not found"

**Causa:** O Storage não foi criado no Firebase Console.

**Solução:**
1. Acesse Firebase Console → Storage
2. Clique em "Get started" ou "Começar"
3. Escolha o modo (Production ou Test)
4. Selecione a localização
5. Clique em "Done" ou "Concluído"

### Erro: "File too large"

**Causa:** A imagem excede o limite de 5MB.

**Solução:**
- Redimensione ou comprima a imagem antes de fazer upload
- O limite pode ser ajustado no código (padrão: 5MB)

## 📝 Notas Importantes

- ✅ As imagens são públicas (qualquer um pode ver)
- ✅ Apenas usuários autenticados podem fazer upload
- ✅ O tamanho máximo por imagem é 5MB (configurável)
- ✅ Formatos aceitos: JPG, JPEG, PNG, WEBP
- ✅ As URLs das imagens são permanentes (não expiram)

