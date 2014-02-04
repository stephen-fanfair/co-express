const wrapper = require('../index')
const request = require('supertest')
const express = require('express')
const should = require('should')

function thunk (req) {
  return function (done) {
    req.end(done)
  }
}

function waitText (err, text) {
  return function(cb) {
    setImmediate(function () {
      cb(err, text)
    })
  }
}

function wait (time, fn) {
  return function (done) {
    setTimeout(function () {
      try { fn() }
      catch (e) {
        return done(e)
      }
      done()
    }, time)
  }
}

describe('co-express', function () {
  var app

  function* thunkText (req, res) {
    req.val = (req.val || '') + (yield waitText(null, 'a'))
  }

  beforeEach(function () {
    app = wrapper(express())
  })

  it('should support use middleware', function* () {
    app.use(thunkText)

    app.get('/', function (req, res) {
      res.send(req.val + 'b')
    })

    var req = request(app)
      .get('/')
      .expect('ab')

    yield thunk(req)
  })

  it('should support multiple generators', function* () {
    app.get('/', thunkText, function(req, res) {
      res.send(req.val + 'b')
    })

    var req = request(app)
      .get('/')
      .expect('ab')

    yield thunk(req)
  })

  it('should not continue after send', function* () {
    app.get('/', thunkText, function* (req, res) {
      res.send(req.val + 'b')
    })

    var err
    app.get('/', function* (req, res) {
      err = new Error('boom!')
    })

    var req = request(app)
      .get('/')
      .expect('ab')

    yield thunk(req)
    yield wait(100, function () {
      should.not.exist(err)
    })
  })

  it('should pass uncaught exceptions to error handler', function* () {
    app.get('/', function* (req, res) {
      var val = yield waitText(new Error('thunk error'))
      res.send(val)
    })

    app.use(function (err, req, res, next) {
      if (err && err.message === 'thunk error') {
        res.send('caught')
      } else {
        next(err)
      }
    })

    var req = request(app)
      .get('/')
      .expect('caught')

    yield thunk(req)
  })
})
