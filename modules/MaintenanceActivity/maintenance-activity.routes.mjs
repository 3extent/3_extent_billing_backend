import express from 'express';
import { createMaintenanceActivity } from './maintenance-activity.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

// POST /api/maintenance_activity
router.post('/', verifyToken, createMaintenanceActivity);

export default router;
