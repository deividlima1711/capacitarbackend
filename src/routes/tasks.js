const express = require('express');
const Task = require('../models/Task');
const Process = require('../models/Process');
const { auth, managerAuth } = require('../middleware/auth');

const router = express.Router();

// Listar todas as tarefas
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      assignedTo,
      process: processId,
      search 
    } = req.query;

    const query = {};
    
    // Filtros
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (processId) query.process = processId;
    
    // Busca por texto
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name username email')
      .populate('process', 'title status')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Erro ao listar tarefas:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar tarefa por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name username email')
      .populate('process', 'title status')
      .populate('createdBy', 'name username')
      .populate('comments.user', 'name username')
      .populate('dependencies', 'title status');

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json(task);

  } catch (error) {
    console.error('Erro ao buscar tarefa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova tarefa
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 Criando nova tarefa');
    console.log('📋 Body:', req.body);
    console.log('👤 User:', req.user?.username);
    
    const {
      title,
      description,
      status,
      priority,
      assignedTo,
      process: processId,
      dueDate,
      estimatedHours,
      tags,
      checklist
    } = req.body;

    // Validação mais robusta
    if (!title || !assignedTo) {
      console.log('❌ Campos obrigatórios faltando');
      return res.status(400).json({ 
        error: 'Título e responsável são obrigatórios',
        received: {
          title: !!title,
          assignedTo: !!assignedTo,
          process: !!processId
        }
      });
    }

    // Verificar se o processo existe (se foi fornecido)
    if (processId) {
      const process = await Process.findById(processId);
      if (!process) {
        console.log(`❌ Processo não encontrado: ${processId}`);
        return res.status(404).json({ error: 'Processo não encontrado' });
      }
    }

    console.log(`✅ Criando tarefa: ${title}`);

    const task = new Task({
      title,
      description,
      status: status || 'PENDENTE',
      priority: priority || 'MEDIA',
      assignedTo,
      process: processId,
      dueDate,
      estimatedHours: estimatedHours || 0,
      tags: tags || [],
      checklist: checklist || [],
      createdBy: req.user._id,
      progress: 0
    });

    await task.save();
    
    await task.populate('assignedTo', 'name username email');
    if (processId) {
      await task.populate('process', 'title status');
    }
    await task.populate('createdBy', 'name username');

    console.log(`✅ Tarefa criada com sucesso: ${task.title}`);

    res.status(201).json(task);

  } catch (error) {
    console.error('Erro ao criar tarefa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar tarefa
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Verificar permissão (criador, responsável ou admin/manager)
    const canEdit = task.createdBy.toString() === req.user._id.toString() ||
                   task.assignedTo.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

    if (!canEdit) {
      return res.status(403).json({ error: 'Sem permissão para editar esta tarefa' });
    }

    const updates = req.body;
    
    // Se status mudou para CONCLUIDA, definir data de conclusão
    if (updates.status === 'CONCLUIDA' && task.status !== 'CONCLUIDA') {
      updates.completedDate = new Date();
      updates.progress = 100;
    }

    Object.assign(task, updates);
    await task.save();

    await task.populate('assignedTo', 'name username email');
    await task.populate('process', 'title status');
    await task.populate('createdBy', 'name username');

    res.json(task);

  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar tarefa
router.delete('/:id', managerAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tarefa deletada com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar tarefa:', error.message);
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

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    task.comments.push({
      user: req.user._id,
      text
    });

    await task.save();
    await task.populate('comments.user', 'name username');

    res.status(201).json(task.comments[task.comments.length - 1]);

  } catch (error) {
    console.error('Erro ao adicionar comentário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar checklist
router.put('/:id/checklist/:itemId', auth, async (req, res) => {
  try {
    const { completed } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const checklistItem = task.checklist.id(req.params.itemId);
    
    if (!checklistItem) {
      return res.status(404).json({ error: 'Item do checklist não encontrado' });
    }

    checklistItem.completed = completed;
    if (completed) {
      checklistItem.completedAt = new Date();
      checklistItem.completedBy = req.user._id;
    } else {
      checklistItem.completedAt = undefined;
      checklistItem.completedBy = undefined;
    }

    // Calcular progresso baseado no checklist
    const totalItems = task.checklist.length;
    const completedItems = task.checklist.filter(item => item.completed).length;
    task.progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    await task.save();

    res.json(task);

  } catch (error) {
    console.error('Erro ao atualizar checklist:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Tarefas do usuário logado
router.get('/my/tasks', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { assignedTo: req.user._id };
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('process', 'title status')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);

  } catch (error) {
    console.error('Erro ao buscar tarefas do usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de tarefas
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalTasks = await Task.countDocuments();
    const myTasks = await Task.countDocuments({ assignedTo: req.user._id });
    const overdue = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $nin: ['CONCLUIDA', 'CANCELADA'] }
    });

    const avgProgress = await Task.aggregate([
      {
        $group: {
          _id: null,
          avgProgress: { $avg: '$progress' }
        }
      }
    ]);

    res.json({
      totalTasks,
      myTasks,
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

