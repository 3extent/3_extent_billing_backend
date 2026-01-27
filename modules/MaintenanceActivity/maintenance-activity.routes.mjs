import express from 'express';
import { createMaintenanceActivity } from './maintenance-activity.controller.mjs';

const router = express.Router();

// POST /api/maintenance_activity
router.post('/', createMaintenanceActivity);

export default router;
