/**
 * 统一 API 响应格式
 * { code, message, data, total?, page?, pageSize? }
 */

function success(res, data = null, message = 'ok') {
  return res.json({ code: 200, message, data });
}

function paginated(res, data, total, page, pageSize) {
  return res.json({ code: 200, message: 'ok', data, total, page, pageSize });
}

function fail(res, message = '操作失败', code = 400) {
  return res.status(code).json({ code, message, data: null });
}

function serverError(res, err) {
  console.error('[ServerError]', err);
  const msg = process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误';
  return res.status(500).json({ code: 500, message: msg, data: null });
}

/**
 * 分页参数解析
 */
function parsePaging(query) {
  const page     = Math.max(1, parseInt(query.page     || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20')));
  const offset   = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

module.exports = { success, paginated, fail, serverError, parsePaging };
