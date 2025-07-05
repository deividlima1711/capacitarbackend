const express = require('express');
const User = require('../models/User');
const Process = require('../models/Process');
const Task = require('../models/Task');
const { auth, managerAuth } = require('../middleware/auth');

const router = express.Router();

// Listar membros da equipe
router.get('/members', auth, async (req, res) => {
  try {
    const { department, role } = req.query;
    
    const query = { isActive: true };
    
    if (department) query.department = department;
    if (role) query.role = role;

    const members = await User.find(query)
      .select('_id name username email role department lastLogin')
      .sort({ name: 1 });

    res.json(members);

  } catch (error) {
    console.error('Erro ao listar membros:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas da equipe
router.get('/stats', auth, async (req, res) => {
  try {
    const { department } = req.query;
    
    // Filtro por departamento se especificado
    const userFilter = department ? { department, isActive: true } : { isActive: true };
    
    // Buscar usuários do departamento/equipe
    const teamMembers = await User.find(userFilter).select('_id');
    const memberIds = teamMembers.map(member => member._id);

    // Estatísticas de processos
    const processStats = await Process.aggregate([
      {
        $match: {
          $or: [
            { responsible: { $in: memberIds } },
            { team: { $in: memberIds } }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Estatísticas de tarefas
    const taskStats = await Task.aggregate([
      {
        $match: { assignedTo: { $in: memberIds } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Produtividade por membro
    const memberProductivity = await Task.aggregate([
      {
        $match: { 
          assignedTo: { $in: memberIds },
          status: 'CONCLUIDA'
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          completedTasks: { $sum: 1 },
          totalHours: { $sum: '$actualHours' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          name: '$user.name',
          username: '$user.username',
          completedTasks: 1,
          totalHours: 1
        }
      },
      {
        $sort: { completedTasks: -1 }
      }
    ]);

    // Carga de trabalho atual
    const currentWorkload = await Task.aggregate([
      {
        $match: { 
          assignedTo: { $in: memberIds },
          status: { $in: ['PENDENTE', 'EM_ANDAMENTO'] }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          activeTasks: { $sum: 1 },
          estimatedHours: { $sum: '$estimatedHours' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          name: '$user.name',
          username: '$user.username',
          activeTasks: 1,
          estimatedHours: 1
        }
      },
      {
        $sort: { activeTasks: -1 }
      }
    ]);

    res.json({
      totalMembers: teamMembers.length,
      processStats,
      taskStats,
      memberProductivity,
      currentWorkload
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas da equipe:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Performance individual do membro
router.get('/member/:id/performance', auth, async (req, res) => {
  try {
    const memberId = req.params.id;
    
    // Verificar se o usuário pode ver esta informação
    if (memberId !== req.user._id.toString() && 
        !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const member = await User.findById(memberId).select('name username email role department');
    
    if (!member) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    // Tarefas concluídas nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedTasks = await Task.countDocuments({
      assignedTo: memberId,
      status: 'CONCLUIDA',
      completedDate: { $gte: thirtyDaysAgo }
    });

    // Tarefas ativas
    const activeTasks = await Task.countDocuments({
      assignedTo: memberId,
      status: { $in: ['PENDENTE', 'EM_ANDAMENTO'] }
    });

    // Tarefas em atraso
    const overdueTasks = await Task.countDocuments({
      assignedTo: memberId,
      status: { $in: ['PENDENTE', 'EM_ANDAMENTO'] },
      dueDate: { $lt: new Date() }
    });

    // Processos onde é responsável
    const responsibleProcesses = await Process.countDocuments({
      responsible: memberId
    });

    // Média de tempo para conclusão de tarefas
    const avgCompletionTime = await Task.aggregate([
      {
        $match: {
          assignedTo: memberId,
          status: 'CONCLUIDA',
          startDate: { $exists: true },
          completedDate: { $exists: true }
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$completedDate', '$startDate'] },
              1000 * 60 * 60 * 24 // converter para dias
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$completionTime' }
        }
      }
    ]);

    res.json({
      member,
      recentCompletedTasks,
      activeTasks,
      overdueTasks,
      responsibleProcesses,
      avgCompletionDays: avgCompletionTime[0]?.avgDays || 0
    });

  } catch (error) {
    console.error('Erro ao buscar performance do membro:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar departamentos
router.get('/departments', auth, async (req, res) => {
  try {
    const departments = await User.aggregate([
      {
        $match: { 
          department: { $exists: true, $ne: null, $ne: '' },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$department',
          memberCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(departments);

  } catch (error) {
    console.error('Erro ao listar departamentos:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de produtividade da equipe
router.get('/productivity-report', managerAuth, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const userFilter = { isActive: true };
    if (department) userFilter.department = department;

    const teamMembers = await User.find(userFilter).select('_id');
    const memberIds = teamMembers.map(member => member._id);

    const matchFilter = { assignedTo: { $in: memberIds } };
    if (Object.keys(dateFilter).length > 0) {
      matchFilter.completedDate = dateFilter;
    }

    const productivityReport = await Task.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: {
            user: '$assignedTo',
            status: '$status'
          },
          count: { $sum: 1 },
          totalHours: { $sum: '$actualHours' },
          avgProgress: { $avg: '$progress' }
        }
      },
      {
        $group: {
          _id: '$_id.user',
          tasks: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalHours: '$totalHours',
              avgProgress: '$avgProgress'
            }
          },
          totalTasks: { $sum: '$count' },
          totalHours: { $sum: '$totalHours' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          name: '$user.name',
          username: '$user.username',
          department: '$user.department',
          tasks: 1,
          totalTasks: 1,
          totalHours: 1
        }
      },
      {
        $sort: { totalTasks: -1 }
      }
    ]);

    res.json(productivityReport);

  } catch (error) {
    console.error('Erro ao gerar relatório de produtividade:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

