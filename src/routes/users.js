const express = require('express');
const User = require('../models/User');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');

const router = express.Router();

// Listar todos os usuários (apenas admin/manager)
router.get('/', managerAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      department,
      search,
      isActive 
    } = req.query;

    const query = {};
    
    // Filtros
    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Busca por texto
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuário por ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Usuários podem ver apenas seu próprio perfil, admin/manager podem ver todos
    if (req.params.id !== req.user._id.toString() && 
        !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);

  } catch (error) {
    console.error('Erro ao buscar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo usuário (apenas admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    console.log('📝 Criando novo usuário');
    console.log('📋 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const {
      username,
      password,
      name,
      email,
      role,
      department
    } = req.body;

    // Validação detalhada e robusta
    const missingFields = [];
    if (!username || typeof username !== 'string' || username.trim() === '') missingFields.push('username');
    if (!password || typeof password !== 'string' || password.trim() === '') missingFields.push('password');
    if (!name || typeof name !== 'string' || name.trim() === '') missingFields.push('name');
    if (!email || typeof email !== 'string' || email.trim() === '') missingFields.push('email');
    
    if (missingFields.length > 0) {
      console.log('❌ Campos obrigatórios faltando:', missingFields);
      return res.status(400).json({
        error: `Campos obrigatórios ausentes ou inválidos: ${missingFields.join(', ')}`,
        received: {
          username: !!username,
          password: !!password,
          name: !!name,
          email: !!email
        },
        recebido: req.body
      });
    }

    // Verificar se username já existe
    const existingUser = await User.findOne({ 
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });

    if (existingUser) {
      console.log(`❌ Username ou email já existe: ${username} / ${email}`);
      return res.status(400).json({ error: 'Username ou email já existe' });
    }

    console.log(`✅ Criando usuário: ${username}`);

    const user = new User({
      username: username.toLowerCase(),
      password,
      name,
      email: email.toLowerCase(),
      role: role || 'user',
      department: department || 'Geral',
      isActive: true
    });

    await user.save();

    console.log(`✅ Usuário criado com sucesso: ${user.username}`);

    // Remover senha da resposta
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);

  } catch (error) {
    console.error('Erro ao criar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário
router.put('/:id', auth, async (req, res) => {
  try {
    // Usuários podem editar apenas seu próprio perfil, admin pode editar todos
    if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updates = req.body;
    
    // Remover campos que não podem ser atualizados por usuários comuns
    if (req.user.role !== 'admin') {
      delete updates.role;
      delete updates.isActive;
    }

    // Não permitir atualização de password por esta rota
    delete updates.password;

    // Verificar se email já existe (se estiver sendo alterado)
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email já existe' });
      }
      updates.email = updates.email.toLowerCase();
    }

    Object.assign(user, updates);
    await user.save();

    res.json(user);

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário (apenas admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir deletar o próprio usuário admin
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Usuário deletado com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar/Desativar usuário (apenas admin)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir desativar o próprio usuário admin
    if (req.params.id === req.user._id.toString() && !isActive) {
      return res.status(400).json({ error: 'Não é possível desativar seu próprio usuário' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({ message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso` });

  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários para seleção (dropdown)
router.get('/list/select', auth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('_id name username email role department')
      .sort({ name: 1 });

    res.json(users);

  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Perfil do usuário logado
router.get('/profile/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);

  } catch (error) {
    console.error('Erro ao buscar perfil:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do usuário logado
router.put('/profile/me', auth, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remover campos que não podem ser atualizados
    delete updates.password;
    delete updates.role;
    delete updates.isActive;
    delete updates.username;

    // Verificar se email já existe (se estiver sendo alterado)
    if (updates.email && updates.email !== req.user.email) {
      const existingUser = await User.findOne({ email: updates.email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email já existe' });
      }
      updates.email = updates.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de usuários (apenas admin/manager)
router.get('/stats/dashboard', managerAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await User.aggregate([
      {
        $match: { department: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleStats,
      departmentStats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

