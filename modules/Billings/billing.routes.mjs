import express from 'express';
import {
  getBillings,
  getBillingById,
  createBilling,
  updateBilling,
  updateBillingPayment,
  deleteBilling
} from './billing.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

router.get('/',verifyToken, getBillings);
router.get('/:id',verifyToken, getBillingById);
router.post('/',verifyToken, createBilling);
router.put('/:id',verifyToken, updateBilling);
router.put('/payment/:id',verifyToken, updateBillingPayment);
router.delete('/:id',verifyToken, deleteBilling);

export default router;
