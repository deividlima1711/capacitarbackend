const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { validateRequest, sendResponse } = require('../utils/validators');
const ModelName = require('../models/ModelName'); // Substitua ModelName
const logger = require('../utils/logger');

const router = express.Router();

// Schema de validação para criação
const createSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  category: {
    type: 'string',
    required: true,
    enum: ['category1', 'category2', 'category3']
  },
  isActive: {
    type: 'boolean',
    required: false,
    default: true
  }
};

// Schema de validação para atualização
const updateSchema = {
  name: {
    type: 'string',
    required: false,
    minLength: 2,
    maxLength: 100
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  category: {
    type: 'string',
    required: false,
    enum: ['category1', 'category2', 'category3']
  },
  isActive: {
    type: 'boolean',
    required: false
  }
};

/**
 * Lista todos os recursos com paginação
 * @route GET /api/v1/resources
 * @param {number} [page=1] - Número da página
 * @param {number} [limit=10] - Itens por página
 * @param {string} [search] - Termo de busca
 * @param {string} [category] - Filtro por categoria
 * @param {boolean} [isActive] - Filtro por status ativo
 * @returns {Object} 200 - Lista de recursos com paginação
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive
    } = req.query;

    logger.info('🔍 Listando recursos', {
      userId: req.user._id,
      filters: { search, category, isActive },
      pagination: { page, limit }
    });

    // Construir filtros
    const filters = {};
    
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filters.category = category;
    }
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Buscar recursos
    const [resources, total] = await Promise.all([
      ModelName.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name username')
        .lean(),
      ModelName.countDocuments(filters)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    logger.info('✅ Recursos listados com sucesso', {
      total,
      page: parseInt(page),
      totalPages
    });

    return sendResponse(res, 200, {
      resources,
      pagination: {
        total,
        page: parseInt(page),
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('❌ Erro ao listar recursos', error);
    return sendResponse(res, 500, null, '', 'Erro interno do servidor');
  }
});

/**
 * Busca um recurso específico por ID
 * @route GET /api/v1/resources/:id
 * @param {string} id - ID do recurso
 * @returns {Object} 200 - Recurso encontrado
 * @returns {Object} 404 - Recurso não encontrado
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('🔍 Buscando recurso por ID', {
      resourceId: id,
      userId: req.user._id
    });

    const resource = await ModelName.findById(id)
      .populate('createdBy', 'name username')
      .lean();

    if (!resource) {
      logger.warn('❌ Recurso não encontrado', { resourceId: id });
      return sendResponse(res, 404, null, '', 'Recurso não encontrado');
    }

    logger.info('✅ Recurso encontrado', { resourceId: id });
    return sendResponse(res, 200, resource);

  } catch (error) {
    logger.error('❌ Erro ao buscar recurso', error);
    return sendResponse(res, 500, null, '', 'Erro interno do servidor');
  }
});

/**
 * Cria um novo recurso
 * @route POST /api/v1/resources
 * @param {Object} req.body - Dados do recurso
 * @param {string} req.body.name - Nome do recurso
 * @param {string} [req.body.description] - Descrição do recurso
 * @param {string} req.body.category - Categoria do recurso
 * @param {boolean} [req.body.isActive=true] - Status ativo
 * @returns {Object} 201 - Recurso criado com sucesso
 * @returns {Object} 400 - Erro de validação
 * @returns {Object} 409 - Recurso já existe
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer
 */
router.post('/', auth, async (req, res) => {
  try {
    logger.info('📝 Criando novo recurso', {
      userId: req.user._id,
      body: req.body
    });

    // Validação
    const validation = validateRequest(createSchema, req.body);
    if (!validation.isValid) {
      logger.warn('❌ Erro de validação', validation);
      return sendResponse(res, 400, {
        missingFields: validation.missingFields,
        errors: validation.errors
      }, '', 'Erro de validação');
    }

    const { name, description, category, isActive = true } = req.body;

    // Verificar se já existe
    const existingResource = await ModelName.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingResource) {
      logger.warn('❌ Recurso já existe', { name });
      return sendResponse(res, 409, null, '', 'Recurso com este nome já existe');
    }

    // Criar recurso
    const resource = new ModelName({
      name: name.trim(),
      description: description?.trim(),
      category,
      isActive,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await resource.save();
    await resource.populate('createdBy', 'name username');

    logger.info('✅ Recurso criado com sucesso', {
      resourceId: resource._id,
      name: resource.name
    });

    return sendResponse(res, 201, resource, 'Recurso criado com sucesso');

  } catch (error) {
    logger.error('❌ Erro ao criar recurso', error);
    return sendResponse(res, 500, null, '', 'Erro interno do servidor');
  }
});

/**
 * Atualiza um recurso existente
 * @route PUT /api/v1/resources/:id
 * @param {string} id - ID do recurso
 * @param {Object} req.body - Dados a serem atualizados
 * @returns {Object} 200 - Recurso atualizado com sucesso
 * @returns {Object} 400 - Erro de validação
 * @returns {Object} 404 - Recurso não encontrado
 * @returns {Object} 409 - Conflito (nome já existe)
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('✏️ Atualizando recurso', {
      resourceId: id,
      userId: req.user._id,
      updates: req.body
    });

    // Validação
    const validation = validateRequest(updateSchema, req.body);
    if (!validation.isValid) {
      logger.warn('❌ Erro de validação', validation);
      return sendResponse(res, 400, {
        errors: validation.errors
      }, '', 'Erro de validação');
    }

    // Buscar recurso
    const resource = await ModelName.findById(id);
    if (!resource) {
      logger.warn('❌ Recurso não encontrado para atualização', { resourceId: id });
      return sendResponse(res, 404, null, '', 'Recurso não encontrado');
    }

    // Verificar permissão (exemplo: apenas criador ou admin pode editar)
    if (resource.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn('❌ Usuário sem permissão para editar recurso', {
        resourceId: id,
        userId: req.user._id,
        resourceCreator: resource.createdBy
      });
      return sendResponse(res, 403, null, '', 'Sem permissão para editar este recurso');
    }

    const updates = req.body;

    // Verificar se nome já existe (se estiver sendo alterado)
    if (updates.name && updates.name !== resource.name) {
      const existingResource = await ModelName.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updates.name}$`, 'i') }
      });

      if (existingResource) {
        logger.warn('❌ Nome de recurso já existe', { name: updates.name });
        return sendResponse(res, 409, null, '', 'Recurso com este nome já existe');
      }
    }

    // Aplicar atualizações
    Object.assign(resource, updates);
    resource.updatedBy = req.user._id;
    resource.updatedAt = new Date();

    await resource.save();
    await resource.populate('createdBy updatedBy', 'name username');

    logger.info('✅ Recurso atualizado com sucesso', {
      resourceId: id,
      name: resource.name
    });

    return sendResponse(res, 200, resource, 'Recurso atualizado com sucesso');

  } catch (error) {
    logger.error('❌ Erro ao atualizar recurso', error);
    return sendResponse(res, 500, null, '', 'Erro interno do servidor');
  }
});

/**
 * Remove um recurso (soft delete)
 * @route DELETE /api/v1/resources/:id
 * @param {string} id - ID do recurso
 * @returns {Object} 200 - Recurso removido com sucesso
 * @returns {Object} 404 - Recurso não encontrado
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('🗑️ Removendo recurso', {
      resourceId: id,
      userId: req.user._id
    });

    const resource = await ModelName.findById(id);
    if (!resource) {
      logger.warn('❌ Recurso não encontrado para remoção', { resourceId: id });
      return sendResponse(res, 404, null, '', 'Recurso não encontrado');
    }

    // Verificar permissão (apenas criador ou admin pode remover)
    if (resource.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn('❌ Usuário sem permissão para remover recurso', {
        resourceId: id,
        userId: req.user._id,
        resourceCreator: resource.createdBy
      });
      return sendResponse(res, 403, null, '', 'Sem permissão para remover este recurso');
    }

    // Soft delete
    resource.isActive = false;
    resource.deletedAt = new Date();
    resource.deletedBy = req.user._id;
    
    await resource.save();

    logger.info('✅ Recurso removido com sucesso', {
      resourceId: id,
      name: resource.name
    });

    return sendResponse(res, 200, null, 'Recurso removido com sucesso');

  } catch (error) {
    logger.error('❌ Erro ao remover recurso', error);
    return sendResponse(res, 500, null, '', 'Erro interno do servidor');
  }
});

/**
 * Ativa/desativa um recurso (apenas admin)
 * @route PATCH /api/v1/resources/:id/toggle-status
 * @param {string} id - ID do recurso
 * @returns {Object} 200 - Status alterado com sucesso
 * @returns {Object} 404 - Recurso não encontrado
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer (Admin)
 */
router.patch('/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('🔄 Alternando status do recurso', {
      resourceId: id,
      userId: req.user._id
    });

    const resource = await ModelName.findById(id);
    if (!resource) {
      logger.warn('❌ Recurso não encontrado', { resourceId: id });
      return sendResponse(res, 404, null, '', 'Recurso não encontrado');
    }

    resource.isActive = !resource.isActive;
    resource.updatedBy = req.user._id;
    resource.updatedAt = new Date();

    await resource.save();

    logger.info('✅ Status do recurso alterado', {
      resourceId: id,
      newStatus: resource.isActive
    });

    return sendResponse(res, 200, {
      id: resource._id,
      isActive: resource.isActive
    }, `Recurso ${resource.isActive ? 'ativado' : 'desativado'} com sucesso`);

  } catch (error) {
    logger.error('❌ Erro ao alterar status do recurso', error);
    return sendResponse(res, 500, null, '', 'Erro interno do servidor');
  }
});

module.exports = router;
