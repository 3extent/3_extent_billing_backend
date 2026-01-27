import express from 'express';
import {
  getMaintenanceCriteriaList,
  getMaintenanceCriteriaById,
  createMaintenanceCriteria
} from './maintenance-criteria.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

router.get('/',verifyToken, getMaintenanceCriteriaList);
router.get('/:id',verifyToken, getMaintenanceCriteriaById);
router.post('/',verifyToken, createMaintenanceCriteria);

export default router;
