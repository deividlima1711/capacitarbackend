const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
    default: 'PENDENTE'
  },
  priority: {
    type: String,
    enum: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'],
    default: 'MEDIA'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  process: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Process',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  checklist: [{
    item: {
      type: String,
      required: true,
      maxlength: 200
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar updatedAt
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para melhor performance
taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ process: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);

