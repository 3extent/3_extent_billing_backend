import express from 'express';
import {
  getModels,
  createModel,
  getModelById,
  updateModel
} from './model.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

router.get('/', verifyToken, getModels);
router.post('/', verifyToken, createModel);
router.get('/:id', verifyToken, getModelById);
router.put('/:id', verifyToken, updateModel);

export default router;
