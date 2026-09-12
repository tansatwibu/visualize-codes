const express = require('express');
const { createDataController } = require('../controllers/data.controller');

function createDataRouter(dependencies) {
  const router = express.Router();
  const controller = createDataController(dependencies);

  router.get('/data', controller.getData);
  router.get('/sample', controller.getSample);

  return router;
}

module.exports = { createDataRouter };
