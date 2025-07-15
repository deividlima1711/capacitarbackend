const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Schema para [Nome do Modelo]
 * 
 * Este modelo representa [descrição do que o modelo representa]
 * 
 * @example
 * const resource = new ModelName({
 *   name: 'Nome do Recurso',
 *   description: 'Descrição detalhada',
 *   category: 'category1',
 *   isActive: true
 * });
 */
const modelNameSchema = new mongoose.Schema({
  // Campo obrigatório de texto
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
    index: true // Índice para busca rápida
  },

  // Campo opcional de texto
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres'],
    default: ''
  },

  // Campo com valores enumerados
  category: {
    type: String,
    required: [true, 'Categoria é obrigatória'],
    enum: {
      values: ['category1', 'category2', 'category3'],
      message: 'Categoria deve ser: category1, category2 ou category3'
    },
    index: true
  },

  // Campo numérico com validação
  priority: {
    type: Number,
    min: [1, 'Prioridade deve ser pelo menos 1'],
    max: [10, 'Prioridade deve ser no máximo 10'],
    default: 5
  },

  // Campo de data com validação customizada
  startDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= new Date();
      },
      message: 'Data de início não pode ser no passado'
    }
  },

  // Campo de data opcional
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || !this.startDate || value > this.startDate;
      },
      message: 'Data de fim deve ser posterior à data de início'
    }
  },

  // Array de strings com validação
  tags: [{
    type: String,
    trim: true,
    minlength: [2, 'Tag deve ter pelo menos 2 caracteres'],
    maxlength: [30, 'Tag deve ter no máximo 30 caracteres']
  }],

  // Referência para outro modelo
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Criador é obrigatório'],
    index: true
  },

  // Referência para outro modelo (opcional)
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Referência para outro modelo (soft delete)
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Campo de status booleano
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Campo para soft delete
  deletedAt: {
    type: Date,
    default: null
  },

  // Objeto aninhado com validação
  metadata: {
    source: {
      type: String,
      enum: ['manual', 'import', 'api'],
      default: 'manual'
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    lastSync: Date
  },

  // Array de objetos aninhados
  history: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'activated', 'deactivated', 'deleted'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changes: mongoose.Schema.Types.Mixed // Para armazenar mudanças específicas
  }],

  // Campo de configurações (JSON flexível)
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, {
  // Opções do schema
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  
  // Transformação para JSON
  toJSON: {
    transform: function(doc, ret) {
      // Remover campos sensíveis da resposta JSON
      delete ret.__v;
      delete ret.deletedAt;
      delete ret.deletedBy;
      
      // Formatar datas
      if (ret.createdAt) {
        ret.createdAt = ret.createdAt.toISOString();
      }
      if (ret.updatedAt) {
        ret.updatedAt = ret.updatedAt.toISOString();
      }
      
      return ret;
    }
  },

  // Transformação para Object
  toObject: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// ==================== ÍNDICES ====================

// Índice composto para busca eficiente
modelNameSchema.index({ name: 1, category: 1 });

// Índice de texto para busca full-text
modelNameSchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  },
  name: 'text_search_index'
});

// Índice para soft delete
modelNameSchema.index({ isActive: 1, deletedAt: 1 });

// ==================== MIDDLEWARES ====================

// Middleware pré-save para validações complexas
modelNameSchema.pre('save', async function(next) {
  try {
    // Log da operação
    console.log(`💾 Salvando ${this.constructor.modelName}: ${this.name || this._id}`);

    // Adicionar histórico da mudança
    if (this.isModified() && !this.isNew) {
      const changes = this.getChanges();
      if (Object.keys(changes).length > 0) {
        this.history.push({
          action: 'updated',
          userId: this.updatedBy,
          changes
        });
      }
    }

    // Validação customizada complexa
    if (this.endDate && this.startDate && this.endDate <= this.startDate) {
      throw new Error('Data de fim deve ser posterior à data de início');
    }

    // Normalizar dados
    if (this.name) {
      this.name = this.name.trim();
    }

    // Limitar array de tags
    if (this.tags && this.tags.length > 10) {
      throw new Error('Máximo de 10 tags permitidas');
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Middleware pré-remove para soft delete
modelNameSchema.pre('remove', function(next) {
  console.log(`🗑️ Removendo ${this.constructor.modelName}: ${this.name || this._id}`);
  next();
});

// ==================== MÉTODOS DE INSTÂNCIA ====================

/**
 * Ativa o recurso
 * @param {ObjectId} userId - ID do usuário que está ativando
 * @returns {Promise<void>}
 */
modelNameSchema.methods.activate = async function(userId) {
  this.isActive = true;
  this.deletedAt = null;
  this.deletedBy = null;
  this.updatedBy = userId;
  
  this.history.push({
    action: 'activated',
    userId
  });
  
  return this.save();
};

/**
 * Desativa o recurso (soft delete)
 * @param {ObjectId} userId - ID do usuário que está desativando
 * @returns {Promise<void>}
 */
modelNameSchema.methods.deactivate = async function(userId) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.updatedBy = userId;
  
  this.history.push({
    action: 'deactivated',
    userId
  });
  
  return this.save();
};

/**
 * Incrementa a versão do metadata
 * @returns {Promise<void>}
 */
modelNameSchema.methods.incrementVersion = async function() {
  this.metadata.version += 1;
  this.metadata.lastSync = new Date();
  return this.save();
};

/**
 * Verifica se o usuário pode editar este recurso
 * @param {Object} user - Objeto do usuário
 * @returns {boolean}
 */
modelNameSchema.methods.canEdit = function(user) {
  // Admin pode editar tudo
  if (user.role === 'admin') return true;
  
  // Criador pode editar seu próprio recurso
  if (this.createdBy.toString() === user._id.toString()) return true;
  
  // Manager pode editar recursos ativos
  if (user.role === 'manager' && this.isActive) return true;
  
  return false;
};

/**
 * Obtém as mudanças feitas no documento
 * @returns {Object} Objeto com as mudanças
 */
modelNameSchema.methods.getChanges = function() {
  const changes = {};
  const modifiedPaths = this.modifiedPaths();
  
  for (const path of modifiedPaths) {
    if (path !== 'updatedAt' && path !== 'history') {
      changes[path] = {
        from: this.get(path, null, { getters: false }),
        to: this[path]
      };
    }
  }
  
  return changes;
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Busca recursos ativos por categoria
 * @param {string} category - Categoria a buscar
 * @returns {Promise<Array>}
 */
modelNameSchema.statics.findActiveByCategory = function(category) {
  return this.find({
    category,
    isActive: true,
    deletedAt: null
  }).sort({ createdAt: -1 });
};

/**
 * Busca com texto livre
 * @param {string} searchTerm - Termo de busca
 * @param {Object} options - Opções de busca
 * @returns {Promise<Array>}
 */
modelNameSchema.statics.searchText = function(searchTerm, options = {}) {
  const {
    category,
    isActive = true,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    $text: { $search: searchTerm },
    isActive,
    deletedAt: null
  };

  if (category) {
    query.category = category;
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

/**
 * Obtém estatísticas dos recursos
 * @returns {Promise<Object>}
 */
modelNameSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $match: { deletedAt: null }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        inactive: {
          $sum: { $cond: ['$isActive', 0, 1] }
        },
        byCategory: {
          $push: '$category'
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        active: 1,
        inactive: 1,
        categories: {
          $reduce: {
            input: '$byCategory',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [{ k: '$$this', v: { $add: [{ $ifNull: [`$$value.$$this`, 0] }, 1] } }]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    active: 0,
    inactive: 0,
    categories: {}
  };
};

// ==================== VIRTUAL FIELDS ====================

/**
 * Campo virtual para obter o tempo desde criação
 */
modelNameSchema.virtual('ageInDays').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

/**
 * Campo virtual para status legível
 */
modelNameSchema.virtual('statusText').get(function() {
  if (this.deletedAt) return 'Removido';
  return this.isActive ? 'Ativo' : 'Inativo';
});

/**
 * Campo virtual para URL amigável
 */
modelNameSchema.virtual('slug').get(function() {
  if (!this.name) return '';
  return this.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
});

// ==================== QUERY HELPERS ====================

/**
 * Query helper para buscar apenas recursos ativos
 */
modelNameSchema.query.onlyActive = function() {
  return this.where({ isActive: true, deletedAt: null });
};

/**
 * Query helper para buscar por categoria
 */
modelNameSchema.query.byCategory = function(category) {
  return this.where({ category });
};

/**
 * Query helper para ordenar por prioridade
 */
modelNameSchema.query.byPriority = function() {
  return this.sort({ priority: -1, createdAt: -1 });
};

// ==================== EXPORTS ====================

// Criar o modelo
const ModelName = mongoose.model('ModelName', modelNameSchema);

module.exports = ModelName;

// ==================== EXEMPLO DE USO ====================

/*
// Criar um novo recurso
const resource = new ModelName({
  name: 'Meu Recurso',
  description: 'Descrição do recurso',
  category: 'category1',
  priority: 8,
  tags: ['importante', 'urgente'],
  createdBy: userId
});

await resource.save();

// Buscar recursos ativos por categoria
const resources = await ModelName.findActiveByCategory('category1');

// Buscar com texto
const searchResults = await ModelName.searchText('recurso importante', {
  category: 'category1',
  limit: 10
});

// Usar query helpers
const activeResources = await ModelName
  .find()
  .onlyActive()
  .byCategory('category1')
  .byPriority()
  .populate('createdBy', 'name username');

// Obter estatísticas
const stats = await ModelName.getStats();

// Métodos de instância
await resource.activate(userId);
await resource.deactivate(userId);
const canEdit = resource.canEdit(user);
*/
