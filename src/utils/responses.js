// src/utils/responses.js

/**
 * Utilitários para padronizar respostas da API
 */

class ApiResponse {
  /**
   * Resposta de sucesso
   * @param {Object} res - Response object
   * @param {any} data - Dados a serem retornados
   * @param {string} message - Mensagem de sucesso
   * @param {number} statusCode - Código HTTP
   */
  static success(res, data = null, message = 'Operação realizada com sucesso', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Resposta de erro
   * @param {Object} res - Response object
   * @param {string} error - Mensagem de erro
   * @param {number} statusCode - Código HTTP
   * @param {any} details - Detalhes do erro
   * @param {string} code - Código de erro personalizado
   */
  static error(res, error, statusCode = 500, details = null, code = null) {
    const response = {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };

    if (details) response.details = details;
    if (code) response.code = code;

    return res.status(statusCode).json(response);
  }

  /**
   * Resposta com paginação
   * @param {Object} res - Response object
   * @param {Array} data - Dados paginados
   * @param {Object} pagination - Informações de paginação
   * @param {string} message - Mensagem
   */
  static paginated(res, data, pagination, message = 'Dados encontrados') {
    return res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(pagination.page),
        limit: parseInt(pagination.limit),
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      },
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Resposta de criação
   * @param {Object} res - Response object
   * @param {any} data - Dados criados
   * @param {string} message - Mensagem
   */
  static created(res, data, message = 'Recurso criado com sucesso') {
    return this.success(res, data, message, 201);
  }

  /**
   * Resposta de atualização
   * @param {Object} res - Response object
   * @param {any} data - Dados atualizados
   * @param {string} message - Mensagem
   */
  static updated(res, data, message = 'Recurso atualizado com sucesso') {
    return this.success(res, data, message, 200);
  }

  /**
   * Resposta de deleção
   * @param {Object} res - Response object
   * @param {string} message - Mensagem
   */
  static deleted(res, message = 'Recurso removido com sucesso') {
    return res.status(204).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Resposta de não encontrado
   * @param {Object} res - Response object
   * @param {string} message - Mensagem
   */
  static notFound(res, message = 'Recurso não encontrado') {
    return this.error(res, message, 404, null, 'RESOURCE_NOT_FOUND');
  }

  /**
   * Resposta de não autorizado
   * @param {Object} res - Response object
   * @param {string} message - Mensagem
   */
  static unauthorized(res, message = 'Token de acesso requerido') {
    return this.error(res, message, 401, null, 'UNAUTHORIZED');
  }

  /**
   * Resposta de acesso negado
   * @param {Object} res - Response object
   * @param {string} message - Mensagem
   */
  static forbidden(res, message = 'Acesso negado') {
    return this.error(res, message, 403, null, 'FORBIDDEN');
  }

  /**
   * Resposta de validação
   * @param {Object} res - Response object
   * @param {Array} details - Detalhes dos erros de validação
   * @param {string} message - Mensagem
   */
  static validationError(res, details, message = 'Dados inválidos') {
    return this.error(res, message, 422, details, 'VALIDATION_ERROR');
  }

  /**
   * Resposta de conflito
   * @param {Object} res - Response object
   * @param {string} message - Mensagem
   */
  static conflict(res, message = 'Recurso já existe') {
    return this.error(res, message, 409, null, 'CONFLICT');
  }

  /**
   * Resposta de erro interno
   * @param {Object} res - Response object
   * @param {string} message - Mensagem
   * @param {any} details - Detalhes (apenas em development)
   */
  static internalError(res, message = 'Erro interno do servidor', details = null) {
    const errorDetails = process.env.NODE_ENV === 'development' ? details : null;
    return this.error(res, message, 500, errorDetails, 'INTERNAL_ERROR');
  }
}

module.exports = ApiResponse;
