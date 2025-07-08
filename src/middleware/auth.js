const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('❌ Auth: Header Authorization não encontrado');
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    // Verificar se o header tem o formato correto "Bearer token"
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth: Header Authorization não tem formato Bearer');
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.trim() === '') {
      console.log('❌ Auth: Token vazio após extração');
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    // Verificar se JWT_SECRET está configurado
    if (!process.env.JWT_SECRET) {
      console.error('❌ Auth: JWT_SECRET não configurado nas variáveis de ambiente');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    // Log do token para debugging (apenas primeiros e últimos caracteres)
    console.log(`🔍 Auth: Verificando token ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);

    // Verificar se o token tem o formato JWT válido (3 partes separadas por ponto)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Auth: Token não tem formato JWT válido (3 partes)');
      return res.status(401).json({ error: 'Token malformado' });
    }

    // Verificar e decodificar o token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`✅ Auth: Token válido para usuário ${decoded.userId}`);
    } catch (jwtError) {
      console.log('❌ Auth: Erro na verificação JWT:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      } else {
        return res.status(401).json({ error: 'Falha na autenticação' });
      }
    }

    // Buscar usuário no banco de dados
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log(`❌ Auth: Usuário ${decoded.userId} não encontrado no banco`);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!user.isActive) {
      console.log(`❌ Auth: Usuário ${decoded.userId} está inativo`);
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Adicionar dados do usuário à requisição
    req.user = user;
    req.token = token;
    
    console.log(`✅ Auth: Usuário ${user.username} autenticado com sucesso`);
    next();
    
  } catch (error) {
    console.error('❌ Auth: Erro interno na autenticação:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para verificar se é admin
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        console.log(`❌ AdminAuth: Usuário ${req.user.username} não é admin (role: ${req.user.role})`);
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }
      console.log(`✅ AdminAuth: Admin ${req.user.username} autorizado`);
      next();
    });
  } catch (error) {
    console.error('❌ AdminAuth: Erro:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar se é admin ou manager
const managerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (!['admin', 'manager'].includes(req.user.role)) {
        console.log(`❌ ManagerAuth: Usuário ${req.user.username} não é admin/manager (role: ${req.user.role})`);
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou gerentes.' });
      }
      console.log(`✅ ManagerAuth: ${req.user.role} ${req.user.username} autorizado`);
      next();
    });
  } catch (error) {
    console.error('❌ ManagerAuth: Erro:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { auth, adminAuth, managerAuth };

