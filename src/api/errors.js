function createApiError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function sendApiError(res, error) {
  const status = error.status || 500;
  const payload = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Unexpected server error.',
    },
  };

  if (error.details) {
    payload.error.details = error.details;
  }

  return res.status(status).json(payload);
}

module.exports = {
  createApiError,
  sendApiError,
};
