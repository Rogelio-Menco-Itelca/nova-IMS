// Envuelve un controlador async y propaga errores a Express
function asyncHandler(fn) {
  return function asyncHandlerMiddleware(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
