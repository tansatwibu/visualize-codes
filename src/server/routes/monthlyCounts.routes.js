const express = require('express');
const { createMonthlyCountsController } = require('../controllers/monthlyCounts.controller');

function createMonthlyCountsRouter(dependencies) {
  const router = express.Router();
  const controller = createMonthlyCountsController(dependencies);

  router.get('/monthly-counts', controller.getMonthlyCounts);

  return router;
}

module.exports = { createMonthlyCountsRouter };
