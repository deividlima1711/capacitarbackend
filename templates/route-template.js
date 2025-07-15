// templates/route-template.js

/**
 * Template padrão para criação de novas rotas
 * 
 * Para usar este template:
 * 1. Copie este arquivo
 * 2. Renomeie para o nome da sua rota (ex: categories.js)
 * 3. Substitua 'Resource' pelo nome da sua entidade
 * 4. Substitua 'resources' pelo nome no plural
 * 5. Ajuste as validações e lógica específica
 */

const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const ApiResponse = require('../utils/responses');
const { logger } = require('../utils/logger');
const { PAGINATION } = require('../utils/constants');
const { resourceValidations } = require('../utils/validators'); // Ajustar nome
const Resource = require('../models/Resource'); // Ajustar nome do modelo

const router = express.Router();

/**
 * @swagger
 * /api/v1/resources:
 *   get:
 *     summary: Listar recursos
 *     tags: [Resources]
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
 *         description: Busca por texto
 *     responses:
 *       200:
 *         description: Lista de recursos
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', auth, async (req, res) => {
  try {
    const startTime = Date.now();
    const { 
      page = PAGINATION.DEFAULT_PAGE, 
      limit = PAGINATION.DEFAULT_LIMIT, 
      sort = '-createdAt',
      search,
      status,
      // Adicionar outros filtros específicos aqui
      ...filters 
    } = req.query;

    logger.info(`Listando recursos`, { 
      user: req.user.username,
      filters: { page, limit, search, status, ...filters }
    });

    // Construir query de filtros
    const query = {};
    
    // Filtros específicos
    if (status) query.status = status;
    
    // Busca por texto
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Adicionar filtros adicionais se necessário
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        query[key] = filters[key];
      }
    });

    // Executar consulta com paginação
    const resources = await Resource.find(query)
      .populate('createdBy', 'name username')
      // Adicionar outros populate necessários
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Resource.countDocuments(query);

    const duration = Date.now() - startTime;
    logger.performance('List resources', duration);

    return ApiResponse.paginated(res, resources, { page, limit, total });

  } catch (error) {
    logger.error('Erro ao listar recursos', {
      error: error.message,
      stack: error.stack,
      user: req.user?.username
    });
    
    return ApiResponse.internalError(res, 'Erro ao listar recursos', error.message);
  }
});

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   get:
 *     summary: Buscar recurso por ID
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do recurso
 *     responses:
 *       200:
 *         description: Recurso encontrado
 *       404:
 *         description: Recurso não encontrado
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.debug(`Buscando recurso ${id}`, { user: req.user.username });

    const resource = await Resource.findById(id)
      .populate('createdBy', 'name username')
      // Adicionar outros populate necessários

    if (!resource) {
      logger.warn(`Recurso não encontrado: ${id}`, { user: req.user.username });
      return ApiResponse.notFound(res, 'Recurso não encontrado');
    }

    logger.success(`Recurso encontrado: ${id}`, { user: req.user.username });
    return ApiResponse.success(res, resource, 'Recurso encontrado');

  } catch (error) {
    logger.error('Erro ao buscar recurso', {
      error: error.message,
      resourceId: req.params.id,
      user: req.user?.username
    });
    
    return ApiResponse.internalError(res, 'Erro ao buscar recurso');
  }
});

/**
 * @swagger
 * /api/v1/resources:
 *   post:
 *     summary: Criar novo recurso
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recurso criado com sucesso
 *       422:
 *         description: Dados inválidos
 */
router.post('/', 
  auth, 
  resourceValidations.create, // Ajustar validações
  validateRequest, 
  async (req, res) => {
    try {
      logger.info('Criando novo recurso', { 
        user: req.user.username,
        data: req.body 
      });

      const resourceData = {
        ...req.body,
        createdBy: req.user._id
      };

      const resource = new Resource(resourceData);
      await resource.save();
      
      // Popular campos necessários
      await resource.populate('createdBy', 'name username');

      logger.success(`Recurso criado: ${resource._id}`, { 
        user: req.user.username,
        resourceId: resource._id 
      });

      return ApiResponse.created(res, resource, 'Recurso criado com sucesso');

    } catch (error) {
      logger.error('Erro ao criar recurso', {
        error: error.message,
        data: req.body,
        user: req.user?.username
      });

      if (error.name === 'ValidationError') {
        const details = Object.values(error.errors).map(e => e.message);
        return ApiResponse.validationError(res, details, 'Dados inválidos');
      }

      if (error.code === 11000) {
        return ApiResponse.conflict(res, 'Recurso já existe');
      }
      
      return ApiResponse.internalError(res, 'Erro ao criar recurso');
    }
  }
);

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   put:
 *     summary: Atualizar recurso
 *     tags: [Resources]
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
 *         description: Recurso atualizado
 *       404:
 *         description: Recurso não encontrado
 */
router.put('/:id', 
  auth, 
  resourceValidations.update, // Ajustar validações
  validateRequest, 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      logger.info(`Atualizando recurso ${id}`, { 
        user: req.user.username,
        data: req.body 
      });

      const resource = await Resource.findById(id);

      if (!resource) {
        logger.warn(`Recurso não encontrado para atualização: ${id}`, { 
          user: req.user.username 
        });
        return ApiResponse.notFound(res, 'Recurso não encontrado');
      }

      // Verificar permissões (ajustar conforme necessário)
      const canEdit = resource.createdBy.toString() === req.user._id.toString() ||
                     ['admin', 'manager'].includes(req.user.role);

      if (!canEdit) {
        logger.warn(`Usuário sem permissão para editar recurso ${id}`, { 
          user: req.user.username,
          resourceOwner: resource.createdBy
        });
        return ApiResponse.forbidden(res, 'Sem permissão para editar este recurso');
      }

      // Atualizar campos
      Object.assign(resource, req.body);
      resource.updatedBy = req.user._id;
      
      await resource.save();
      await resource.populate('createdBy', 'name username');

      logger.success(`Recurso atualizado: ${id}`, { 
        user: req.user.username 
      });

      return ApiResponse.updated(res, resource, 'Recurso atualizado com sucesso');

    } catch (error) {
      logger.error('Erro ao atualizar recurso', {
        error: error.message,
        resourceId: req.params.id,
        data: req.body,
        user: req.user?.username
      });
      
      return ApiResponse.internalError(res, 'Erro ao atualizar recurso');
    }
  }
);

/**
 * @swagger
 * /api/v1/resources/{id}:
 *   delete:
 *     summary: Remover recurso
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Recurso removido
 *       404:
 *         description: Recurso não encontrado
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Removendo recurso ${id}`, { user: req.user.username });

    const resource = await Resource.findById(id);

    if (!resource) {
      logger.warn(`Recurso não encontrado para remoção: ${id}`, { 
        user: req.user.username 
      });
      return ApiResponse.notFound(res, 'Recurso não encontrado');
    }

    // Verificar permissões (ajustar conforme necessário)
    const canDelete = resource.createdBy.toString() === req.user._id.toString() ||
                     ['admin'].includes(req.user.role);

    if (!canDelete) {
      logger.warn(`Usuário sem permissão para remover recurso ${id}`, { 
        user: req.user.username 
      });
      return ApiResponse.forbidden(res, 'Sem permissão para remover este recurso');
    }

    await Resource.findByIdAndDelete(id);

    logger.success(`Recurso removido: ${id}`, { user: req.user.username });

    return ApiResponse.deleted(res, 'Recurso removido com sucesso');

  } catch (error) {
    logger.error('Erro ao remover recurso', {
      error: error.message,
      resourceId: req.params.id,
      user: req.user?.username
    });
    
    return ApiResponse.internalError(res, 'Erro ao remover recurso');
  }
});

module.exports = router;
