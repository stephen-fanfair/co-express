var co = require('co')
var methods = require('methods')
var slice = Array.prototype.slice

function isGenerator (v) {
  return typeof v === 'function' && 'GeneratorFunction' === v.constructor.name
}

function wrapResponseMethod (method) {
  return function () {
    this.sent = true
    method.apply(this, arguments)
  }
}

function convertGenerators (v) {
  return ! isGenerator(v) ? v : function (req, res, next) {
    res.render = wrapResponseMethod(res.render)
    res.send = wrapResponseMethod(res.send)

    co(v).call(this, req, res, function (err, v) {
      if (err || ! res.sent) next(err)
    })
  }
}

function wrapAppMethod (route) {
  return function () {
    var args = slice.call(arguments)
    return route.apply(this, args.map(convertGenerators))
  }
}

module.exports = function (app) {
  methods.forEach(function (method) {
    app[method] = wrapAppMethod(app[method])
  })

  app.param = wrapAppMethod(app.param)
  app.use = wrapAppMethod(app.use)
  app.all = wrapAppMethod(app.all)
  app.del = app.delete

  return app
}