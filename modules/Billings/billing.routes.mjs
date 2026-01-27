import express from 'express';
import {
  getBillings,
  getBillingById,
  createBilling,
  updateBilling,
  updateBillingPayment,
  deleteBilling
} from './billing.controller.mjs';

const router = express.Router();

router.get('/', getBillings);
router.get('/:id', getBillingById);
router.post('/', createBilling);
router.put('/:id', updateBilling);
router.put('/payment/:id', updateBillingPayment);
router.delete('/:id', deleteBilling);

export default router;
