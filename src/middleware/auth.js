const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar se é admin
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar se é admin ou manager
const managerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou gerentes.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { auth, adminAuth, managerAuth };

