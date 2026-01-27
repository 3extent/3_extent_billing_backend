import express from 'express';
import {
  getModels,
  createModel,
  getModelById,
  updateModel
} from './model.controller.mjs';

const router = express.Router();

router.get('/', getModels);
router.post('/', createModel);
router.get('/:id', getModelById);
router.put('/:id', updateModel);

export default router;
