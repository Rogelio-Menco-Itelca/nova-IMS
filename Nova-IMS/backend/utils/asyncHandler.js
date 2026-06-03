// Envuelve un controlador async y propaga errores a Express
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
