# ProcessFlow Backend - API Completa

Backend completo para o sistema ProcessFlow - SaaS de gerenciamento de processos empresariais.

## 🚀 Funcionalidades

- ✅ Autenticação JWT completa
- ✅ Gerenciamento de usuários com roles
- ✅ CRUD de processos empresariais
- ✅ Gerenciamento de tarefas
- ✅ Sistema de equipes
- ✅ Middleware de segurança (Helmet, CORS, Rate Limiting)
- ✅ Seed automático de usuário admin
- ✅ Validação de dados robusta

## 📋 Pré-requisitos

- Node.js >= 18.0.0
- MongoDB Atlas ou MongoDB local
- NPM ou Yarn

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

**Variáveis obrigatórias:**

```env
# Banco de dados MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/processflow?retryWrites=true&w=majority

# Chave secreta JWT (mínimo 32 caracteres)
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_com_pelo_menos_32_caracteres

# Porta do servidor
PORT=5000

# Ambiente
NODE_ENV=production
```

### 3. Iniciar Servidor

```bash
# Produção
npm start

# Desenvolvimento (com nodemon)
npm run dev
```

## 🔐 Autenticação

### Usuário Admin Padrão

O sistema cria automaticamente um usuário admin:

- **Usuário:** `admin`
- **Senha:** `Lima12345`
- **Role:** `admin`

### Endpoints de Autenticação

#### POST `/api/auth/login`
Realizar login no sistema.

**Request:**
```json
{
  "username": "admin",
  "password": "Lima12345"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "username": "admin",
    "name": "Administrador",
    "email": "admin@processflow.com",
    "role": "admin",
    "department": null
  }
}
```

#### GET `/api/auth/verify`
Verificar se o token é válido.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": { ... }
}
```

#### POST `/api/auth/logout`
Realizar logout (invalidar token no frontend).

**Headers:**
```
Authorization: Bearer <token>
```

## 📚 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/change-password` - Alterar senha

### Usuários
- `GET /api/users` - Listar usuários (requer auth)
- `POST /api/users` - Criar usuário (requer admin)
- `GET /api/users/:id` - Buscar usuário (requer auth)
- `PUT /api/users/:id` - Atualizar usuário (requer auth)
- `DELETE /api/users/:id` - Deletar usuário (requer admin)

### Processos
- `GET /api/processes` - Listar processos (requer auth)
- `POST /api/processes` - Criar processo (requer auth)
- `GET /api/processes/:id` - Buscar processo (requer auth)
- `PUT /api/processes/:id` - Atualizar processo (requer auth)
- `DELETE /api/processes/:id` - Deletar processo (requer manager/admin)

### Tarefas
- `GET /api/tasks` - Listar tarefas (requer auth)
- `POST /api/tasks` - Criar tarefa (requer auth)
- `GET /api/tasks/:id` - Buscar tarefa (requer auth)
- `PUT /api/tasks/:id` - Atualizar tarefa (requer auth)
- `DELETE /api/tasks/:id` - Deletar tarefa (requer auth)

### Equipes
- `GET /api/teams` - Listar equipes (requer auth)
- `POST /api/teams` - Criar equipe (requer manager/admin)
- `GET /api/teams/:id` - Buscar equipe (requer auth)
- `PUT /api/teams/:id` - Atualizar equipe (requer manager/admin)
- `DELETE /api/teams/:id` - Deletar equipe (requer admin)

## 🧪 Testando a API

### 1. Teste de Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Lima12345"
  }'
```

### 2. Teste de Rota Protegida

```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer <seu_token_aqui>"
```

### 3. Teste de Status

```bash
curl -X GET http://localhost:5000/
```

## 🔒 Segurança

### Implementações de Segurança

- ✅ **Helmet:** Proteção de headers HTTP
- ✅ **CORS:** Configurado para frontend específico
- ✅ **Rate Limiting:** 100 requests por 15 minutos por IP
- ✅ **JWT:** Tokens com expiração de 24h
- ✅ **Bcrypt:** Hash de senhas com salt 12
- ✅ **Validação:** Entrada de dados validada
- ✅ **Middleware:** Autenticação em rotas protegidas

### Roles de Usuário

- **admin:** Acesso completo ao sistema
- **manager:** Gerenciamento de processos e equipes
- **user:** Acesso básico a tarefas e processos

## 🚀 Deploy

### Railway (Recomendado)

1. Conecte seu repositório ao Railway
2. Configure as variáveis de ambiente
3. Deploy automático

### Heroku

1. Instale Heroku CLI
2. Configure variáveis de ambiente
3. Deploy:

```bash
heroku create seu-app-name
heroku config:set MONGODB_URI=sua_uri
heroku config:set JWT_SECRET=seu_secret
git push heroku main
```

### Vercel (Serverless)

1. Configure `vercel.json`
2. Deploy via CLI ou GitHub

## 📝 Logs

O sistema gera logs detalhados:

- ✅ Conexão com MongoDB
- ✅ Criação de usuário admin
- ✅ Erros de autenticação
- ✅ Requests e responses
- ✅ Erros do servidor

## 🐛 Troubleshooting

### Erro: "Rota não encontrada"
- Verifique se todas as rotas estão com prefixo `/api/`
- Confirme se os arquivos de rota estão sendo importados corretamente

### Erro: "Token de acesso requerido"
- Verifique se o header `Authorization: Bearer <token>` está sendo enviado
- Confirme se o token não expirou (24h)

### Erro de conexão MongoDB
- Verifique se `MONGODB_URI` está configurado corretamente
- Confirme se o IP está liberado no MongoDB Atlas
- Teste a conexão diretamente

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Email: suporte@processflow.com
- Documentação: [docs.processflow.com](https://docs.processflow.com)

---

**Versão:** 1.0.0  
**Autor:** Deivid Lima  
**Licença:** MIT

