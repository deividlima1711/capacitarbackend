// templates/model-template.js

/**
 * Template padrão para criação de novos modelos Mongoose
 * 
 * Para usar este template:
 * 1. Copie este arquivo
 * 2. Renomeie para o nome do seu modelo (ex: Category.js)
 * 3. Substitua 'Resource' pelo nome da sua entidade
 * 4. Ajuste os campos conforme necessário
 * 5. Adicione validações específicas
 */

const mongoose = require('mongoose');
const { STATUS, PRIORITY } = require('../utils/constants');

const resourceSchema = new mongoose.Schema({
  // Campos obrigatórios
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    minlength: [1, 'Título deve ter pelo menos 1 caractere'],
    maxlength: [200, 'Título deve ter no máximo 200 caracteres'],
    index: true // Para busca mais rápida
  },

  // Campos opcionais de texto
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres']
  },

  // Enums com validação
  status: {
    type: String,
    enum: {
      values: Object.values(STATUS.PROCESS), // Ajustar conforme o tipo
      message: 'Status deve ser um dos valores: {VALUE}'
    },
    default: STATUS.PROCESS.PENDING,
    index: true
  },

  priority: {
    type: String,
    enum: {
      values: Object.values(PRIORITY),
      message: 'Prioridade deve ser um dos valores: {VALUE}'
    },
    default: PRIORITY.MEDIUM,
    index: true
  },

  // Referências obrigatórias
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Proprietário é obrigatório'],
    index: true
  },

  // Referências opcionais
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Arrays de referências
  team: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Arrays de strings
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag deve ter no máximo 50 caracteres'],
    lowercase: true
  }],

  // Datas
  startDate: {
    type: Date,
    default: Date.now
  },

  dueDate: {
    type: Date,
    validate: {
      validator: function(value) {
        // Data de vencimento deve ser futura se especificada
        return !value || value > new Date();
      },
      message: 'Data de vencimento deve ser futura'
    }
  },

  completedDate: {
    type: Date,
    validate: {
      validator: function(value) {
        // Data de conclusão só pode ser definida se status for COMPLETED
        if (value && this.status !== STATUS.PROCESS.COMPLETED) {
          return false;
        }
        return true;
      },
      message: 'Data de conclusão só pode ser definida quando status for CONCLUÍDO'
    }
  },

  // Números com validação
  progress: {
    type: Number,
    min: [0, 'Progresso não pode ser negativo'],
    max: [100, 'Progresso não pode ser maior que 100'],
    default: 0,
    validate: {
      validator: function(value) {
        return Number.isInteger(value);
      },
      message: 'Progresso deve ser um número inteiro'
    }
  },

  estimatedHours: {
    type: Number,
    min: [0, 'Horas estimadas não podem ser negativas'],
    validate: {
      validator: function(value) {
        return !value || value > 0;
      },
      message: 'Horas estimadas devem ser positivas'
    }
  },

  actualHours: {
    type: Number,
    min: [0, 'Horas reais não podem ser negativas']
  },

  // Objetos aninhados
  metadata: {
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Categoria deve ter no máximo 100 caracteres']
    },
    
    source: {
      type: String,
      enum: ['manual', 'import', 'api', 'migration'],
      default: 'manual'
    },
    
    version: {
      type: Number,
      default: 1,
      min: [1, 'Versão deve ser pelo menos 1']
    }
  },

  // Arrays de objetos
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'Texto do comentário é obrigatório'],
      trim: true,
      maxlength: [500, 'Comentário deve ter no máximo 500 caracteres']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  }],

  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'other'],
      default: 'other'
    },
    size: {
      type: Number,
      min: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],

  // Campos de auditoria
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Criador é obrigatório'],
    immutable: true // Não pode ser alterado após criação
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Controle de soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: {
    type: Date
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  // Opções do schema
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  
  // Configurações de JSON
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remover campos sensíveis na resposta JSON
      delete ret.__v;
      delete ret.isDeleted;
      return ret;
    }
  },
  
  toObject: { virtuals: true },
  
  // Configurações de validação
  runValidators: true,
  
  // Configurações de versioning
  versionKey: false
});

// ===== ÍNDICES =====

// Índices compostos para queries comuns
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ owner: 1, status: 1 });
resourceSchema.index({ assignedTo: 1, status: 1 });
resourceSchema.index({ dueDate: 1, status: 1 });
resourceSchema.index({ 'metadata.category': 1 });

// Índice de texto para busca
resourceSchema.index({ 
  title: 'text', 
  description: 'text',
  'comments.text': 'text'
});

// ===== VIRTUALS =====

// Campo virtual para verificar se está ativo
resourceSchema.virtual('isActive').get(function() {
  return this.status !== STATUS.PROCESS.CANCELLED && !this.isDeleted;
});

// Campo virtual para verificar se está atrasado
resourceSchema.virtual('isOverdue').get(function() {
  return this.dueDate && 
         this.dueDate < new Date() && 
         this.status !== STATUS.PROCESS.COMPLETED;
});

// Campo virtual para calcular dias restantes
resourceSchema.virtual('daysRemaining').get(function() {
  if (!this.dueDate || this.status === STATUS.PROCESS.COMPLETED) {
    return null;
  }
  
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Campo virtual para progresso calculado
resourceSchema.virtual('calculatedProgress').get(function() {
  if (this.status === STATUS.PROCESS.COMPLETED) {
    return 100;
  }
  if (this.status === STATUS.PROCESS.CANCELLED) {
    return 0;
  }
  return this.progress || 0;
});

// ===== MÉTODOS DE INSTÂNCIA =====

// Método para marcar como concluído
resourceSchema.methods.markAsCompleted = function(userId) {
  this.status = STATUS.PROCESS.COMPLETED;
  this.progress = 100;
  this.completedDate = new Date();
  this.updatedBy = userId;
  return this.save();
};

// Método para cancelar
resourceSchema.methods.cancel = function(userId) {
  this.status = STATUS.PROCESS.CANCELLED;
  this.updatedBy = userId;
  return this.save();
};

// Método para adicionar comentário
resourceSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    user: userId,
    text: text.trim()
  });
  this.updatedBy = userId;
  return this.save();
};

// Método para soft delete
resourceSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Método para restaurar
resourceSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.updatedBy = userId;
  return this.save();
};

// ===== MÉTODOS ESTÁTICOS =====

// Buscar apenas recursos ativos
resourceSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

// Buscar recursos por status
resourceSchema.statics.findByStatus = function(status, filter = {}) {
  return this.findActive({ ...filter, status });
};

// Buscar recursos em atraso
resourceSchema.statics.findOverdue = function(filter = {}) {
  return this.findActive({
    ...filter,
    dueDate: { $lt: new Date() },
    status: { $ne: STATUS.PROCESS.COMPLETED }
  });
};

// Buscar recursos por usuário
resourceSchema.statics.findByUser = function(userId, filter = {}) {
  return this.findActive({
    ...filter,
    $or: [
      { owner: userId },
      { assignedTo: userId },
      { team: userId }
    ]
  });
};

// Estatísticas do usuário
resourceSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: {
        $or: [
          { owner: userId },
          { assignedTo: userId },
          { team: userId }
        ],
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  };

  stats.forEach(stat => {
    result.total += stat.count;
    switch (stat._id) {
      case STATUS.PROCESS.PENDING:
        result.pending = stat.count;
        break;
      case STATUS.PROCESS.IN_PROGRESS:
        result.inProgress = stat.count;
        break;
      case STATUS.PROCESS.COMPLETED:
        result.completed = stat.count;
        break;
      case STATUS.PROCESS.CANCELLED:
        result.cancelled = stat.count;
        break;
    }
  });

  return result;
};

// ===== MIDDLEWARE =====

// Pre-save middleware
resourceSchema.pre('save', function(next) {
  // Atualizar progresso baseado no status
  if (this.isModified('status')) {
    if (this.status === STATUS.PROCESS.COMPLETED) {
      this.progress = 100;
      if (!this.completedDate) {
        this.completedDate = new Date();
      }
    } else if (this.status === STATUS.PROCESS.CANCELLED) {
      this.completedDate = null;
    }
  }

  // Validar que completedDate só existe se status for COMPLETED
  if (this.completedDate && this.status !== STATUS.PROCESS.COMPLETED) {
    this.completedDate = null;
  }

  // Normalizar tags
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(Boolean);
    // Remover duplicatas
    this.tags = [...new Set(this.tags)];
  }

  next();
});

// Pre-find middleware para excluir registros soft deleted por padrão
resourceSchema.pre(/^find/, function() {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// Post-save middleware para logging
resourceSchema.post('save', function(doc, next) {
  console.log(`✅ Resource saved: ${doc._id} - ${doc.title}`);
  next();
});

// ===== VALIDAÇÕES PERSONALIZADAS =====

// Validação para garantir que dueDate seja futura
resourceSchema.pre('validate', function(next) {
  if (this.dueDate && this.dueDate <= new Date()) {
    this.invalidate('dueDate', 'Data de vencimento deve ser futura');
  }
  next();
});

module.exports = mongoose.model('Resource', resourceSchema);
