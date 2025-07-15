// Exemplo de atualização: src/routes/users-v2.js
// Este arquivo demonstra como aplicar os novos padrões às rotas existentes

const express = require('express');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');
const { 
  validateRequest, 
  validatePagination, 
  validateObjectId, 
  sanitizeStrings,
  requireFields,
  validateEnum 
} = require('../middleware/validation');
const ApiResponse = require('../utils/responses');
const { logger } = require('../utils/logger');
const { USER_ROLES, STATUS, PAGINATION } = require('../utils/constants');
const { userValidations } = require('../utils/validators');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Listar usuários
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Limite de itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome, username ou email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, user, viewer]
 *         description: Filtrar por role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get('/', 
  managerAuth, 
  validatePagination, 
  async (req, res) => {
    try {
      const startTime = Date.now();
      const { 
        page, 
        limit 
      } = req.pagination;
      
      const { 
        role, 
        department,
        search,
        isActive,
        sort = '-createdAt'
      } = req.query;

      logger.info('Listando usuários', { 
        user: req.user.username,
        filters: { page, limit, role, department, search, isActive }
      });

      // Construir query de filtros
      const query = {};
      
      if (role && Object.values(USER_ROLES).includes(role)) {
        query.role = role;
      }
      
      if (department) {
        query.department = department;
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      
      // Busca por texto com índice de texto
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Executar consulta com populate seletivo
      const users = await User.find(query)
        .select('-password -__v') // Excluir campos sensíveis
        .populate('createdBy', 'name username')
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(); // Para melhor performance

      const total = await User.countDocuments(query);

      const duration = Date.now() - startTime;
      logger.performance('Lista usuários', duration);

      return ApiResponse.paginated(res, users, { page, limit, total });

    } catch (error) {
      logger.error('Erro ao listar usuários', {
        error: error.message,
        stack: error.stack,
        user: req.user?.username,
        query: req.query
      });
      
      return ApiResponse.internalError(res, 'Erro ao listar usuários');
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Buscar usuário por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', 
  auth, 
  validateObjectId('id'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      logger.debug(`Buscando usuário ${id}`, { user: req.user.username });

      // Verificar se é o próprio usuário ou tem permissão para ver outros
      const canViewOthers = ['admin', 'manager'].includes(req.user.role);
      const isOwnProfile = req.user._id.toString() === id;

      if (!canViewOthers && !isOwnProfile) {
        logger.warn(`Usuário ${req.user.username} tentou acessar perfil de outro usuário`, {
          requestedUserId: id,
          userRole: req.user.role
        });
        return ApiResponse.forbidden(res, 'Sem permissão para visualizar este usuário');
      }

      const user = await User.findById(id)
        .select('-password -__v')
        .populate('createdBy', 'name username')
        .lean();

      if (!user) {
        logger.warn(`Usuário não encontrado: ${id}`, { user: req.user.username });
        return ApiResponse.notFound(res, 'Usuário não encontrado');
      }

      logger.success(`Usuário encontrado: ${id}`, { user: req.user.username });
      return ApiResponse.success(res, user, 'Usuário encontrado');

    } catch (error) {
      logger.error('Erro ao buscar usuário', {
        error: error.message,
        userId: req.params.id,
        user: req.user?.username
      });
      
      return ApiResponse.internalError(res, 'Erro ao buscar usuário');
    }
  }
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Criar novo usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - name
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user, viewer]
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       422:
 *         description: Dados inválidos
 */
router.post('/', 
  adminAuth, 
  sanitizeStrings,
  userValidations.create, 
  validateRequest, 
  async (req, res) => {
    try {
      logger.info('Criando novo usuário', { 
        admin: req.user.username,
        newUser: {
          username: req.body.username,
          email: req.body.email,
          role: req.body.role
        }
      });

      const userData = {
        ...req.body,
        createdBy: req.user._id
      };

      // Verificar se username/email já existem
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        const field = existingUser.username === userData.username ? 'username' : 'email';
        logger.warn('Tentativa de criar usuário com dados duplicados', {
          field,
          value: userData[field],
          admin: req.user.username
        });
        
        return ApiResponse.conflict(res, `${field} já está em uso`);
      }

      const user = new User(userData);
      await user.save();
      
      // Remover senha da resposta e popular campos
      const savedUser = await User.findById(user._id)
        .select('-password -__v')
        .populate('createdBy', 'name username')
        .lean();

      logger.success(`Usuário criado: ${savedUser._id}`, { 
        admin: req.user.username,
        newUserId: savedUser._id,
        username: savedUser.username
      });

      return ApiResponse.created(res, savedUser, 'Usuário criado com sucesso');

    } catch (error) {
      logger.error('Erro ao criar usuário', {
        error: error.message,
        data: { ...req.body, password: '[HIDDEN]' },
        admin: req.user?.username
      });

      if (error.name === 'ValidationError') {
        const details = Object.values(error.errors).map(e => ({
          field: e.path,
          message: e.message
        }));
        return ApiResponse.validationError(res, details, 'Dados inválidos');
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return ApiResponse.conflict(res, `${field} já existe`);
      }
      
      return ApiResponse.internalError(res, 'Erro ao criar usuário');
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Atualizar usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       404:
 *         description: Usuário não encontrado
 */
router.put('/:id', 
  auth, 
  validateObjectId('id'),
  sanitizeStrings,
  userValidations.update, 
  validateRequest, 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      logger.info(`Atualizando usuário ${id}`, { 
        user: req.user.username,
        changes: Object.keys(req.body)
      });

      const user = await User.findById(id);

      if (!user) {
        logger.warn(`Usuário não encontrado para atualização: ${id}`, { 
          user: req.user.username 
        });
        return ApiResponse.notFound(res, 'Usuário não encontrado');
      }

      // Verificar permissões
      const isOwnProfile = user._id.toString() === req.user._id.toString();
      const canEditOthers = ['admin'].includes(req.user.role);
      const canEditRole = req.body.role && ['admin'].includes(req.user.role);

      if (!isOwnProfile && !canEditOthers) {
        logger.warn(`Usuário sem permissão para editar: ${id}`, { 
          user: req.user.username,
          userRole: req.user.role
        });
        return ApiResponse.forbidden(res, 'Sem permissão para editar este usuário');
      }

      // Impedir alteração de role sem permissão
      if (req.body.role && !canEditRole && req.body.role !== user.role) {
        logger.warn(`Tentativa de alterar role sem permissão`, { 
          user: req.user.username,
          targetUser: id,
          newRole: req.body.role
        });
        return ApiResponse.forbidden(res, 'Sem permissão para alterar role');
      }

      // Atualizar campos permitidos
      const allowedFields = ['name', 'email', 'department', 'phone'];
      if (canEditRole) allowedFields.push('role', 'isActive');

      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      updateData.updatedBy = req.user._id;

      Object.assign(user, updateData);
      await user.save();

      const updatedUser = await User.findById(id)
        .select('-password -__v')
        .populate('createdBy', 'name username')
        .populate('updatedBy', 'name username')
        .lean();

      logger.success(`Usuário atualizado: ${id}`, { 
        user: req.user.username,
        updatedFields: Object.keys(updateData)
      });

      return ApiResponse.updated(res, updatedUser, 'Usuário atualizado com sucesso');

    } catch (error) {
      logger.error('Erro ao atualizar usuário', {
        error: error.message,
        userId: req.params.id,
        data: req.body,
        user: req.user?.username
      });

      if (error.name === 'ValidationError') {
        const details = Object.values(error.errors).map(e => ({
          field: e.path,
          message: e.message
        }));
        return ApiResponse.validationError(res, details, 'Dados inválidos');
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return ApiResponse.conflict(res, `${field} já está em uso`);
      }
      
      return ApiResponse.internalError(res, 'Erro ao atualizar usuário');
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}/change-password:
 *   patch:
 *     summary: Alterar senha do usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 */
router.patch('/:id/change-password', 
  auth, 
  validateObjectId('id'),
  requireFields(['currentPassword', 'newPassword']),
  userValidations.changePassword,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      logger.info(`Alterando senha do usuário ${id}`, { user: req.user.username });

      const user = await User.findById(id);

      if (!user) {
        return ApiResponse.notFound(res, 'Usuário não encontrado');
      }

      // Verificar permissões - só pode alterar própria senha ou admin
      const isOwnProfile = user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwnProfile && !isAdmin) {
        logger.warn(`Tentativa de alterar senha de outro usuário`, { 
          user: req.user.username,
          targetUser: id
        });
        return ApiResponse.forbidden(res, 'Sem permissão para alterar senha deste usuário');
      }

      // Verificar senha atual (exceto se for admin alterando senha de outro)
      if (!isAdmin || isOwnProfile) {
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          logger.warn(`Senha atual incorreta`, { 
            user: req.user.username,
            targetUser: id
          });
          return ApiResponse.validationError(
            res, 
            [{ field: 'currentPassword', message: 'Senha atual incorreta' }]
          );
        }
      }

      // Atualizar senha
      user.password = newPassword;
      user.updatedBy = req.user._id;
      await user.save();

      logger.success(`Senha alterada: ${id}`, { user: req.user.username });

      return ApiResponse.success(res, null, 'Senha alterada com sucesso');

    } catch (error) {
      logger.error('Erro ao alterar senha', {
        error: error.message,
        userId: req.params.id,
        user: req.user?.username
      });
      
      return ApiResponse.internalError(res, 'Erro ao alterar senha');
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}/toggle-status:
 *   patch:
 *     summary: Ativar/desativar usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status do usuário alterado
 */
router.patch('/:id/toggle-status', 
  adminAuth, 
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      logger.info(`Alterando status do usuário ${id}`, { admin: req.user.username });

      const user = await User.findById(id);

      if (!user) {
        return ApiResponse.notFound(res, 'Usuário não encontrado');
      }

      // Não permitir desativar o próprio usuário
      if (user._id.toString() === req.user._id.toString()) {
        return ApiResponse.validationError(
          res, 
          [{ field: 'id', message: 'Não é possível alterar status do próprio usuário' }]
        );
      }

      const newStatus = !user.isActive;
      user.isActive = newStatus;
      user.updatedBy = req.user._id;
      await user.save();

      const statusText = newStatus ? 'ativado' : 'desativado';
      logger.success(`Usuário ${statusText}: ${id}`, { admin: req.user.username });

      return ApiResponse.success(
        res, 
        { isActive: newStatus }, 
        `Usuário ${statusText} com sucesso`
      );

    } catch (error) {
      logger.error('Erro ao alterar status do usuário', {
        error: error.message,
        userId: req.params.id,
        admin: req.user?.username
      });
      
      return ApiResponse.internalError(res, 'Erro ao alterar status do usuário');
    }
  }
);

module.exports = router;
