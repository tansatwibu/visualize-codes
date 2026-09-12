const express = require('express');
const { createCodeHistoryController } = require('../controllers/codeHistory.controller');

function createCodeHistoryRouter(dependencies) {
  const router = express.Router();
  const controller = createCodeHistoryController(dependencies);

  router.get('/code-history', controller.getCodeHistory);

  return router;
}

module.exports = { createCodeHistoryRouter };
