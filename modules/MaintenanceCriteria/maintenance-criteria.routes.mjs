import express from 'express';
import {
  getMaintenanceCriteriaList,
  getMaintenanceCriteriaById,
  createMaintenanceCriteria
} from './maintenance-criteria.controller.mjs';

const router = express.Router();

router.get('/', getMaintenanceCriteriaList);
router.get('/:id', getMaintenanceCriteriaById);
router.post('/', createMaintenanceCriteria);

export default router;
