# 🔄 Checklist para Pull Requests - Backend ProcessFlow

## 📋 Checklist Geral

### ✅ Antes de Submeter o PR

- [ ] **Branch atualizada** - Código baseado na branch principal mais recente
- [ ] **Testes passando** - Todos os testes existentes continuam funcionando
- [ ] **Linting** - Código passa no linter sem erros
- [ ] **Build funcionando** - Aplicação compila/executa sem erros

### 📝 Documentação

- [ ] **README atualizado** - Se houve mudanças na configuração ou uso
- [ ] **Documentação inline** - JSDoc/comentários em funções complexas
- [ ] **API docs atualizadas** - Swagger/OpenAPI se novos endpoints
- [ ] **CHANGELOG atualizado** - Se mudança significativa

## 🏗️ Código e Estrutura

### 📂 Organização de Arquivos

- [ ] **Estrutura seguida** - Arquivos na estrutura padrão do projeto
- [ ] **Nomenclatura consistente** - Seguiu convenções de nomes
- [ ] **Separação de responsabilidades** - Lógica no local apropriado
- [ ] **Imports organizados** - Imports agrupados e ordenados

### 🎯 Padrões de Código

- [ ] **Nomenclatura camelCase** - Variáveis e funções em camelCase
- [ ] **Constantes UPPER_CASE** - Constantes em maiúsculo
- [ ] **Funções arrow quando apropriado** - Uso consistente de arrow functions
- [ ] **Async/await preferido** - Em vez de .then/.catch quando possível
- [ ] **Error handling** - Todos os erros tratados adequadamente
- [ ] **Logging implementado** - Logs informativos e de erro

### 🔧 Funcionalidade

- [ ] **Feature funciona** - Funcionalidade implementada conforme especificação
- [ ] **Edge cases tratados** - Cenários extremos considerados
- [ ] **Input validation** - Validação de entrada implementada
- [ ] **Sanitização** - Dados sanitizados quando necessário

## 🛡️ Segurança

### 🔐 Autenticação e Autorização

- [ ] **Rotas protegidas** - Middleware de auth aplicado onde necessário
- [ ] **Permissões verificadas** - Autorização de ações implementada
- [ ] **Tokens validados** - JWT verificado adequadamente
- [ ] **Rate limiting** - Proteção contra abuso implementada

### 🧹 Sanitização e Validação

- [ ] **Input sanitizado** - Dados de entrada limpos
- [ ] **SQL injection prevenida** - Queries parametrizadas/sanitizadas
- [ ] **XSS prevenido** - Dados escapados na saída
- [ ] **Schemas validados** - Mongoose schemas com validações

### 🔒 Dados Sensíveis

- [ ] **Senhas hashadas** - Nunca armazenar senhas em texto plano
- [ ] **Dados pessoais protegidos** - LGPD/GDPR considerados
- [ ] **Logs sem dados sensíveis** - Não logar senhas/tokens completos
- [ ] **Variáveis de ambiente** - Configurações sensíveis em .env

## 🗄️ Banco de Dados

### 📊 Schema e Modelos

- [ ] **Schema seguiu template** - Padrão estabelecido seguido
- [ ] **Validações no schema** - Validações MongoDB implementadas
- [ ] **Índices necessários** - Performance queries otimizada
- [ ] **Relacionamentos corretos** - References/populações adequadas

### ⚡ Performance

- [ ] **Queries otimizadas** - Uso eficiente de find/aggregate
- [ ] **Population seletiva** - Apenas campos necessários populados
- [ ] **Paginação implementada** - Para listas grandes
- [ ] **Soft delete usado** - Quando apropriado

### 🔄 Migrations

- [ ] **Migração criada** - Se mudança no schema
- [ ] **Rollback possível** - Migração reversível
- [ ] **Dados preservados** - Migração não perde dados

## 🌐 API e Endpoints

### 🛣️ Estrutura de Rotas

- [ ] **URLs RESTful** - Seguiu convenções REST
- [ ] **Métodos HTTP corretos** - GET/POST/PUT/DELETE apropriados
- [ ] **Versionamento** - /api/v1/ mantido
- [ ] **Middleware aplicado** - Auth, validation, etc.

### 📤 Respostas

- [ ] **Formato padronizado** - Uso do ApiResponse helper
- [ ] **Status codes corretos** - HTTP status apropriados
- [ ] **Mensagens informativas** - Erros e sucessos claros
- [ ] **Paginação em listas** - Metadados de paginação incluídos

### 📥 Validação de Entrada

- [ ] **Express-validator usado** - Validações implementadas
- [ ] **Mensagens de erro claras** - Feedback útil ao usuário
- [ ] **Sanitização aplicada** - Dados limpos antes do processamento
- [ ] **Campos obrigatórios verificados** - Required fields validados

## 🧪 Testes

### ✅ Cobertura de Testes

- [ ] **Casos felizes testados** - Fluxo principal funciona
- [ ] **Casos de erro testados** - Error handling verificado
- [ ] **Edge cases cobertos** - Cenários extremos testados
- [ ] **Integração testada** - Endpoints testados end-to-end

### 🎯 Qualidade dos Testes

- [ ] **Testes isolados** - Cada teste independente
- [ ] **Setup/teardown adequado** - Banco limpo entre testes
- [ ] **Assertions específicas** - Verificações detalhadas
- [ ] **Mocks quando necessário** - Dependências externas mockadas

### 📊 Dados de Teste

- [ ] **Fixtures criadas** - Dados de teste reutilizáveis
- [ ] **Factory functions** - Geração de dados teste
- [ ] **Cleanup após testes** - Limpeza adequada
- [ ] **Dados realistas** - Cenários próximos da realidade

## 🚀 Performance

### ⚡ Otimizações

- [ ] **Queries eficientes** - N+1 queries evitadas
- [ ] **Caching considerado** - Cache usado quando apropriado
- [ ] **Lazy loading** - Carregamento sob demanda
- [ ] **Compression** - Gzip/compression habilitado

### 📈 Monitoramento

- [ ] **Logs de performance** - Tempo de resposta logado
- [ ] **Métricas coletadas** - Performance monitorada
- [ ] **Memory leaks verificados** - Não há vazamentos de memória
- [ ] **Resource usage** - Uso de CPU/memória controlado

## 🔧 Configuração e Deploy

### ⚙️ Configurações

- [ ] **Variáveis de ambiente** - Configurações externalizadas
- [ ] **Defaults apropriados** - Valores padrão sensatos
- [ ] **Configuração por ambiente** - Dev/staging/prod diferenciados
- [ ] **Secrets gerenciados** - Dados sensíveis protegidos

### 🚢 Deploy Ready

- [ ] **Docker funcionando** - Se usa containers
- [ ] **Health checks** - Endpoint de saúde funcionando
- [ ] **Graceful shutdown** - Aplicação encerra adequadamente
- [ ] **Environment agnostic** - Funciona em qualquer ambiente

## 📋 Checklist Específico por Tipo

### 🆕 Nova Feature

- [ ] **Especificação seguida** - Implementação conforme requisitos
- [ ] **Feature flags** - Se aplicável, flags implementadas
- [ ] **Documentação completa** - Como usar a nova feature
- [ ] **Testes abrangentes** - Todos os cenários cobertos

### 🐛 Bug Fix

- [ ] **Reprodução confirmada** - Bug reproduzido antes do fix
- [ ] **Root cause identificado** - Causa raiz entendida
- [ ] **Regressão prevenida** - Teste para prevenir recorrência
- [ ] **Side effects verificados** - Fix não quebra outras funcionalidades

### 🔄 Refatoração

- [ ] **Comportamento preservado** - Funcionalidade não alterada
- [ ] **Testes mantidos** - Testes existentes ainda passam
- [ ] **Performance igual/melhor** - Não degradou performance
- [ ] **Complexity reduzida** - Código mais limpo/simples

### 🗄️ Database Changes

- [ ] **Backup strategy** - Plano de backup considerado
- [ ] **Migration testada** - Migração testada em ambiente similar
- [ ] **Rollback plan** - Plano de reversão definido
- [ ] **Data integrity** - Integridade de dados preservada

## 🎯 Review Guidelines

### 👀 Para o Reviewer

- [ ] **Lógica de negócio** - Implementação faz sentido
- [ ] **Segurança** - Não há vulnerabilidades óbvias
- [ ] **Performance** - Não há gargalos evidentes
- [ ] **Maintainability** - Código fácil de manter

### ✍️ Para o Author

- [ ] **Self-review feito** - Autor revisou próprio código
- [ ] **Commits organizados** - Commits lógicos e bem nomeados
- [ ] **PR description clara** - Descrição explica mudanças
- [ ] **Breaking changes documentadas** - Mudanças incompatíveis destacadas

## 🚀 Pós-Merge

### 📊 Monitoramento

- [ ] **Deploy monitorado** - Verificar se deploy foi bem-sucedido
- [ ] **Métricas observadas** - Acompanhar impacto das mudanças
- [ ] **Logs verificados** - Checar por novos erros
- [ ] **User feedback** - Coletar feedback dos usuários

### 🔄 Follow-up

- [ ] **Issues relacionadas fechadas** - Tickets relacionados atualizados
- [ ] **Documentation updated** - Docs finais atualizadas
- [ ] **Team notified** - Equipe informada sobre mudanças
- [ ] **Next steps planned** - Próximos passos definidos

---

## 📞 Contatos para Dúvidas

- **Arquitetura**: [Lead Developer]
- **Segurança**: [Security Team]
- **Database**: [DBA Team]
- **DevOps**: [DevOps Team]

**Última atualização**: Janeiro 2025
