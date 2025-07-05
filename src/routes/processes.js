const express = require('express');
const Process = require('../models/Process');
const { auth, managerAuth } = require('../middleware/auth');

const router = express.Router();

// Listar todos os processos
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      responsible,
      search 
    } = req.query;

    const query = {};
    
    // Filtros
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (responsible) query.responsible = responsible;
    
    // Busca por texto
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const processes = await Process.find(query)
      .populate('responsible', 'name username email')
      .populate('team', 'name username email')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Process.countDocuments(query);

    res.json({
      processes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Erro ao listar processos:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar processo por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const process = await Process.findById(req.params.id)
      .populate('responsible', 'name username email')
      .populate('team', 'name username email')
      .populate('createdBy', 'name username')
      .populate('comments.user', 'name username');

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    res.json(process);

  } catch (error) {
    console.error('Erro ao buscar processo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo processo
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      responsible,
      team,
      dueDate,
      category,
      tags
    } = req.body;

    if (!title || !responsible) {
      return res.status(400).json({ error: 'Título e responsável são obrigatórios' });
    }

    const process = new Process({
      title,
      description,
      status,
      priority,
      responsible,
      team,
      dueDate,
      category,
      tags,
      createdBy: req.user._id
    });

    await process.save();
    
    await process.populate('responsible', 'name username email');
    await process.populate('team', 'name username email');
    await process.populate('createdBy', 'name username');

    res.status(201).json(process);

  } catch (error) {
    console.error('Erro ao criar processo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar processo
router.put('/:id', auth, async (req, res) => {
  try {
    const process = await Process.findById(req.params.id);

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Verificar permissão (criador, responsável ou admin/manager)
    const canEdit = process.createdBy.toString() === req.user._id.toString() ||
                   process.responsible.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

    if (!canEdit) {
      return res.status(403).json({ error: 'Sem permissão para editar este processo' });
    }

    const updates = req.body;
    
    // Se status mudou para CONCLUIDO, definir data de conclusão
    if (updates.status === 'CONCLUIDO' && process.status !== 'CONCLUIDO') {
      updates.completedDate = new Date();
      updates.progress = 100;
    }

    Object.assign(process, updates);
    await process.save();

    await process.populate('responsible', 'name username email');
    await process.populate('team', 'name username email');
    await process.populate('createdBy', 'name username');

    res.json(process);

  } catch (error) {
    console.error('Erro ao atualizar processo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar processo
router.delete('/:id', managerAuth, async (req, res) => {
  try {
    const process = await Process.findById(req.params.id);

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    await Process.findByIdAndDelete(req.params.id);

    res.json({ message: 'Processo deletado com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar processo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar comentário
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Texto do comentário é obrigatório' });
    }

    const process = await Process.findById(req.params.id);

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    process.comments.push({
      user: req.user._id,
      text
    });

    await process.save();
    await process.populate('comments.user', 'name username');

    res.status(201).json(process.comments[process.comments.length - 1]);

  } catch (error) {
    console.error('Erro ao adicionar comentário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de processos
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const stats = await Process.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalProcesses = await Process.countDocuments();
    const overdue = await Process.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $nin: ['CONCLUIDO', 'CANCELADO'] }
    });

    const avgProgress = await Process.aggregate([
      {
        $group: {
          _id: null,
          avgProgress: { $avg: '$progress' }
        }
      }
    ]);

    res.json({
      totalProcesses,
      overdue,
      avgProgress: avgProgress[0]?.avgProgress || 0,
      statusStats: stats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

