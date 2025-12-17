# Exemplos de Dados para Firebase

## Sobre os IDs

No Firestore, o campo `id` **NÃO é um campo dentro do documento**. O `id` é o **ID do próprio documento** no Firestore.

- Quando você cria um documento com `addDoc()`, o Firestore **gera automaticamente** um ID único (não é UUID, é um ID próprio do Firestore)
- O ID aparece na URL do documento no console: `/media/abc123xyz`
- No código, quando você lê um documento, você acessa o ID assim: `doc.id`

**Importante:** Nos exemplos abaixo, os IDs são apenas para referência. Quando você adicionar no Firestore Console, o Firestore vai gerar os IDs automaticamente, ou você pode criar os documentos com IDs específicos se quiser.

---

## 1. Coleção: `companies`

Adicione documentos na coleção `companies`:

### Empresa 1
```json
{
  "name": "Outdoor Solutions",
  "logo": "https://via.placeholder.com/200x200?text=Outdoor+Solutions"
}
```

### Empresa 2
```json
{
  "name": "Mídia Urbana SP",
  "logo": "https://via.placeholder.com/200x200?text=Midia+Urbana"
}
```

### Empresa 3
```json
{
  "name": "Publicidade Express",
  "logo": "https://via.placeholder.com/200x200?text=Publicidade+Express"
}
```

---

## 2. Coleção: `media`

Adicione documentos na coleção `media`. **Importante:** Use o ID da empresa que você criou em `companies` no campo `companyId`.

### Mídia 1 - Outdoor Avenida Paulista
```json
{
  "name": "Outdoor Avenida Paulista - Sentido Centro",
  "city": "São Paulo",
  "state": "SP",
  "mediaType": "Outdoor",
  "traffic": 85000,
  "trafficUnit": "veículos/dia",
  "pricePerDay": 1200.00,
  "images": [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
  ],
  "coordinates": {
    "lat": -23.5505,
    "lng": -46.6333
  },
  "address": {
    "street": "Avenida Paulista",
    "number": "1578",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-200",
    "complement": "Próximo ao metrô Trianon"
  },
  "companyId": "COLE_O_ID_DA_EMPRESA_AQUI",
  "companyName": "Outdoor Solutions",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Mídia 2 - Busdoor Linha Vermelha
```json
{
  "name": "Busdoor Ônibus Linha Vermelha - Zona Norte",
  "city": "São Paulo",
  "state": "SP",
  "mediaType": "Busdoor",
  "traffic": 45000,
  "trafficUnit": "passageiros/dia",
  "pricePerDay": 800.00,
  "images": [
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",
    "https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=800"
  ],
  "coordinates": {
    "lat": -23.5000,
    "lng": -46.6000
  },
  "address": {
    "street": "Avenida Radial Leste",
    "number": "500",
    "neighborhood": "Tatuapé",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "03062-000"
  },
  "companyId": "COLE_O_ID_DA_EMPRESA_AQUI",
  "companyName": "Mídia Urbana SP",
  "createdAt": "2024-01-20T14:30:00Z"
}
```

### Mídia 3 - Backlight Shopping Center
```json
{
  "name": "Backlight Shopping Iguatemi",
  "city": "São Paulo",
  "state": "SP",
  "mediaType": "Backlight",
  "traffic": 120000,
  "trafficUnit": "pessoas/dia",
  "pricePerDay": 2000.00,
  "images": [
    "https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=800",
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800"
  ],
  "coordinates": {
    "lat": -23.5800,
    "lng": -46.6800
  },
  "address": {
    "street": "Avenida Brigadeiro Faria Lima",
    "number": "2232",
    "neighborhood": "Jardim Paulistano",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01452-000"
  },
  "companyId": "COLE_O_ID_DA_EMPRESA_AQUI",
  "companyName": "Publicidade Express",
  "createdAt": "2024-02-01T09:15:00Z"
}
```

### Mídia 4 - Outdoor Rio de Janeiro
```json
{
  "name": "Outdoor Avenida Atlântica - Copacabana",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "mediaType": "Outdoor",
  "traffic": 60000,
  "trafficUnit": "veículos/dia",
  "pricePerDay": 1500.00,
  "images": [
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800",
    "https://images.unsplash.com/photo-1516306580123-e6e52b1b9b52?w=800",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
  ],
  "coordinates": {
    "lat": -22.9707,
    "lng": -43.1822
  },
  "address": {
    "street": "Avenida Atlântica",
    "number": "2000",
    "neighborhood": "Copacabana",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "22021-000"
  },
  "companyId": "COLE_O_ID_DA_EMPRESA_AQUI",
  "companyName": "Outdoor Solutions",
  "createdAt": "2024-02-10T11:00:00Z"
}
```

### Mídia 5 - Mupi Belo Horizonte
```json
{
  "name": "Mupi Avenida Afonso Pena",
  "city": "Belo Horizonte",
  "state": "MG",
  "mediaType": "Mupi",
  "traffic": 35000,
  "trafficUnit": "pessoas/dia",
  "pricePerDay": 600.00,
  "images": [
    "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"
  ],
  "coordinates": {
    "lat": -19.9167,
    "lng": -43.9345
  },
  "address": {
    "street": "Avenida Afonso Pena",
    "number": "1500",
    "neighborhood": "Centro",
    "city": "Belo Horizonte",
    "state": "MG",
    "zipCode": "30130-000"
  },
  "companyId": "COLE_O_ID_DA_EMPRESA_AQUI",
  "companyName": "Mídia Urbana SP",
  "createdAt": "2024-02-15T16:45:00Z"
}
```

---

## Como Adicionar no Firestore Console

### Opção 1: Adicionar Manualmente

1. Acesse o Firestore Console
2. Clique em "Start collection" ou na coleção desejada
3. Clique em "Add document"
4. Para o ID do documento:
   - **Deixe em branco** para o Firestore gerar automaticamente, OU
   - **Digite um ID** se quiser definir manualmente (ex: `outdoor-paulista-001`)
5. Adicione os campos um por um:
   - Clique em "Add field"
   - Digite o nome do campo
   - Selecione o tipo (string, number, map, array, timestamp, etc.)
   - Digite o valor

### Opção 2: Usar JSON (mais rápido)

1. No Firestore Console, clique em "Add document"
2. Deixe o ID em branco (ou defina um)
3. Para campos complexos como `address` e `coordinates`:
   - Selecione o tipo **"map"**
   - Adicione os campos dentro do map
4. Para arrays como `images`:
   - Selecione o tipo **"array"**
   - Adicione cada item do array

### Exemplo de Estrutura no Console:

```
Coleção: media
Documento ID: (deixe em branco ou defina)

Campos:
├── name (string): "Outdoor Avenida Paulista"
├── city (string): "São Paulo"
├── state (string): "SP"
├── mediaType (string): "Outdoor"
├── traffic (number): 85000
├── trafficUnit (string): "veículos/dia"
├── pricePerDay (number): 1200.00
├── images (array):
│   ├── [0]: "https://..."
│   ├── [1]: "https://..."
│   └── [2]: "https://..."
├── coordinates (map):
│   ├── lat (number): -23.5505
│   └── lng (number): -46.6333
├── address (map):
│   ├── street (string): "Avenida Paulista"
│   ├── number (string): "1578"
│   ├── neighborhood (string): "Bela Vista"
│   ├── city (string): "São Paulo"
│   ├── state (string): "SP"
│   ├── zipCode (string): "01310-200"
│   └── complement (string): "Próximo ao metrô Trianon"
├── companyId (string): "ID_DA_EMPRESA"
├── companyName (string): "Outdoor Solutions"
└── createdAt (timestamp): 2024-01-15 10:00:00
```

---

## Sobre os IDs - Resumo

- **O `id` não é um campo dentro do documento**
- **O `id` é o ID do documento no Firestore**
- Quando você cria um documento, o Firestore gera automaticamente um ID único
- No código, você acessa assim: `doc.id` ou `docSnap.id`
- Você pode definir o ID manualmente ao criar o documento, mas não é obrigatório

---

## Dica: Como Pegar o ID da Empresa

1. Crie primeiro as empresas na coleção `companies`
2. Depois de criar, você verá o ID do documento (ex: `abc123xyz`)
3. Use esse ID no campo `companyId` das mídias

Ou você pode criar os documentos de empresa com IDs específicos:
- `outdoor-solutions`
- `midia-urbana-sp`
- `publicidade-express`

Assim fica mais fácil de referenciar!

