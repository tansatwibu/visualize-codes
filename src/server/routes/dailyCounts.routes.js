const express = require('express');
const { createDailyCountsController } = require('../controllers/dailyCounts.controller');

function createDailyCountsRouter(dependencies) {
  const router = express.Router();
  const controller = createDailyCountsController(dependencies);

  router.get('/daily-counts', controller.getDailyCounts);

  return router;
}

module.exports = { createDailyCountsRouter };
