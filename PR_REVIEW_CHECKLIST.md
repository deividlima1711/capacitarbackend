# 📋 Checklist de Pull Request - Backend ProcessFlow

Use este checklist antes de abrir qualquer Pull Request para garantir qualidade e consistência.

## ✅ Checklist Obrigatório

### 🔧 Código
- [ ] **Nomenclatura**: Variáveis em camelCase, constantes em SCREAMING_SNAKE_CASE
- [ ] **Funcões**: Nome descritivo e responsabilidade única
- [ ] **Endpoints**: Seguem padrão REST (`/api/v1/recurso`)
- [ ] **Validação**: Todos os campos obrigatórios validados
- [ ] **Sanitização**: Inputs sanitizados contra XSS/injection
- [ ] **Tratamento de Erros**: Try-catch com logs apropriados
- [ ] **Resposta Padronizada**: Usando estrutura padrão de response

### 🔐 Segurança
- [ ] **Autenticação**: Rotas protegidas com middleware `auth`
- [ ] **Autorização**: Verificação de roles quando necessário
- [ ] **Senhas**: Nunca retornadas em responses
- [ ] **Headers de Segurança**: Configurados adequadamente
- [ ] **Rate Limiting**: Aplicado em rotas sensíveis
- [ ] **Sanitização**: Dados de entrada limpos

### 🗃️ Banco de Dados
- [ ] **Queries**: Otimizadas e com índices necessários
- [ ] **Validação**: Schema Mongoose com validações
- [ ] **Transações**: Usadas quando necessário para consistência
- [ ] **Soft Delete**: Implementado onde apropriado
- [ ] **Migração**: Scripts de migração incluídos se necessário

### 📊 Logging e Monitoramento
- [ ] **Logs Estruturados**: Usando padrão de emojis
- [ ] **Informações Suficientes**: Request ID, user ID, timestamps
- [ ] **Sem Dados Sensíveis**: Senhas, tokens não logados
- [ ] **Performance**: Logs de operações demoradas
- [ ] **Erros**: Stack traces capturados e logados

### 🧪 Testes
- [ ] **Testes Unitários**: Lógica de negócio testada
- [ ] **Testes de Integração**: Endpoints testados
- [ ] **Casos de Erro**: Cenários de falha testados
- [ ] **Dados de Teste**: Não vazam para produção
- [ ] **Coverage**: Mínimo 80% de cobertura

### 📄 Documentação
- [ ] **JSDoc**: Funções documentadas com exemplos
- [ ] **README**: Atualizado se necessário
- [ ] **Changelog**: Mudanças documentadas
- [ ] **API Docs**: Endpoints documentados
- [ ] **Schemas**: Estruturas de dados documentadas

### 🚀 Performance
- [ ] **Paginação**: Implementada em listagens
- [ ] **Cache**: Estratégia definida se necessário
- [ ] **Queries N+1**: Evitadas com populate/join
- [ ] **Índices**: Criados para queries frequentes
- [ ] **Compressão**: Respostas grandes comprimidas

---

## 🔍 Checklist de Revisão de Código

### Para o Revisor

#### 🎯 Funcionalidade
- [ ] **Requisitos**: Implementação atende aos requisitos
- [ ] **Casos de Uso**: Todos os cenários cobertos
- [ ] **Edge Cases**: Casos extremos tratados
- [ ] **Compatibilidade**: Não quebra funcionalidades existentes

#### 🏗️ Arquitetura
- [ ] **Separação de Responsabilidades**: Código bem organizado
- [ ] **Reutilização**: Evita duplicação de código
- [ ] **Acoplamento**: Baixo acoplamento entre módulos
- [ ] **Padrões**: Segue padrões do projeto

#### 📝 Qualidade do Código
- [ ] **Legibilidade**: Código fácil de entender
- [ ] **Complexidade**: Funções não muito complexas
- [ ] **Manutenibilidade**: Fácil de modificar/estender
- [ ] **Consistência**: Estilo consistente com o projeto

#### 🔒 Segurança
- [ ] **Validação de Input**: Todas as entradas validadas
- [ ] **Autorização**: Verificação adequada de permissões
- [ ] **Dados Sensíveis**: Não expostos inadvertidamente
- [ ] **Vulnerabilidades**: Não introduz vulnerabilidades conhecidas

---

## 🚨 Red Flags - Rejeitar Imediatamente

### ❌ Problemas Críticos
- **Senhas em texto claro** no código ou logs
- **Tokens/chaves** commitados no repositório
- **SQL Injection** ou NoSQL Injection possível
- **XSS** não tratado em inputs
- **Dados pessoais** logados sem necessidade
- **Endpoints sem autenticação** que deveriam ter
- **Quebra de funcionalidade** existente
- **Testes falhando** no CI/CD

### ⚠️ Problemas Graves
- Falta de validação em campos obrigatórios
- Queries sem paginação retornando muitos dados
- Logs excessivos ou insuficientes
- Tratamento de erro genérico demais
- Código duplicado extensivamente
- Funções muito longas (>50 linhas)
- Falta de documentação em funcionalidades complexas

---

## 📈 Métricas de Qualidade

### 🎯 Metas por PR
- **Tempo de Review**: < 24 horas
- **Linhas por PR**: < 500 linhas de código
- **Comentários**: Máximo 3 rounds de review
- **Aprovação**: Pelo menos 1 revisor senior
- **Testes**: 100% dos testes passando

### 📊 Métricas de Código
- **Cobertura de Testes**: > 80%
- **Complexidade Ciclomática**: < 10 por função
- **Duplicação**: < 3%
- **Debt Ratio**: < 5%
- **Issues Críticas**: 0

---

## 🔄 Processo de Review

### 1️⃣ Autor do PR
1. **Self Review**: Revisar próprio código antes de abrir PR
2. **Testes Locais**: Executar todos os testes localmente
3. **Checklist**: Preencher checklist completo
4. **Descrição**: Escrever descrição detalhada das mudanças
5. **Reviewers**: Adicionar pelo menos 1 revisor senior

### 2️⃣ Revisor
1. **Primeira Passada**: Visão geral da mudança
2. **Review Detalhado**: Linha por linha se necessário
3. **Testes**: Verificar se testes são adequados
4. **Documentação**: Confirmar documentação atualizada
5. **Feedback**: Comentários construtivos e específicos

### 3️⃣ Resolução
1. **Addressing Comments**: Resolver todos os comentários
2. **Re-request Review**: Solicitar nova revisão após mudanças
3. **Approval**: Aguardar aprovação final
4. **Merge**: Merge apenas após todas as verificações

---

## 🛠️ Ferramentas de Apoio

### Linters e Formatters
```bash
# ESLint para JavaScript/Node.js
npm install --save-dev eslint

# Prettier para formatação
npm install --save-dev prettier

# Husky para git hooks
npm install --save-dev husky
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### SonarQube/SonarCloud
- Análise de qualidade de código
- Detecção de vulnerabilidades
- Métricas de maintainability
- Coverage reports

---

## 📝 Templates

### Template de Descrição de PR
```markdown
## 📋 Resumo
Breve descrição das mudanças implementadas.

## 🎯 Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Refatoração
- [ ] Documentação
- [ ] Testes

## 🧪 Como Testar
1. Passo a passo para testar as mudanças
2. Cenários específicos a verificar
3. Dados de teste necessários

## 📸 Screenshots/Logs
Se aplicável, adicionar screenshots ou logs relevantes.

## ✅ Checklist
- [ ] Todos os itens do checklist de PR foram verificados
- [ ] Testes passando localmente
- [ ] Documentação atualizada
- [ ] Self-review realizado

## 🔗 Issues Relacionadas
Fixes #123
Closes #456
```

### Template de Comentário de Review
```markdown
## 🔍 Feedback Geral
Comentário geral sobre o PR.

## ✅ Pontos Positivos
- Item 1
- Item 2

## ⚠️ Pontos de Atenção
- Item 1 (com sugestão de melhoria)
- Item 2 (com exemplo se necessário)

## ❌ Problemas Críticos
- Problema 1 (deve ser corrigido antes do merge)

## 💡 Sugestões Futuras
- Sugestão 1 (não bloqueante)
- Sugestão 2 (pode ser feito em PR futuro)
```

---

## 🎓 Dicas para Reviewers

### ✅ Boas Práticas
- **Seja Construtivo**: Foque em melhorar o código, não criticar
- **Seja Específico**: Aponte exatamente onde e como melhorar
- **Sugira Soluções**: Não apenas aponte problemas
- **Elogie Bom Código**: Reconheça implementações bem feitas
- **Eduque**: Explique o "por quê" das suas sugestões

### ❌ Evite
- Comentários genéricos como "isso está errado"
- Imposição de estilo pessoal sem justificativa
- Nitpicking excessivo em questões menores
- Atraso excessivo em reviews
- Reviews superficiais ou apressadas

---

## 📚 Recursos Adicionais

### 📖 Documentação
- [Guia de Padronização Completo](./STANDARDIZATION_GUIDE.md)
- [Standards de Backend](./BACKEND_STANDARDS.md)
- [Guia de Implementação](./IMPLEMENTATION_GUIDE.md)

### 🔧 Configurações
- [ESLint Config](./.eslintrc.js)
- [Prettier Config](./.prettierrc)
- [Git Hooks](./package.json#husky)

### 🧪 Testes
- [Guia de Testes](./docs/TESTING_GUIDE.md)
- [Exemplos de Testes](./tests/examples/)
- [Mocks e Fixtures](./tests/fixtures/)
