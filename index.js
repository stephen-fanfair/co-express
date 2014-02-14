var co = require('co')
var methods = require('methods')
var slice = Array.prototype.slice

function isGenerator (v) {
  return typeof v === 'function' && 'GeneratorFunction' === v.constructor.name
}

function convert (v) {
	return ! isGenerator(v) ? v : function (req, res, next) {
    function wrapper (method) {
      return function () {
        this.sent = true
        method.apply(this, arguments)
      }
    }

    res.render = wrapper(res.render)
    res.send = wrapper(res.send)

		co(v).call(this, req, res, function (err) {
      setImmediate(function () {
        if ( ! res.sent) next(err)
      })
		})
	}
}

function wrap (route) {
  return function () {
    var args = slice.call(arguments)
    return route.apply(this, args.map(convert))
  }
}

module.exports = function (app) {
  methods.forEach(function (method) {
    app[method] = wrap(app[method])
  })

  app.param = wrap(app.param)
  app.use = wrap(app.use)
  app.all = wrap(app.all)
  app.del = app.delete

  return app
}