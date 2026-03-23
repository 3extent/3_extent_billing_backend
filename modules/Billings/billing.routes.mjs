import express from 'express';
import {
  getBillings,
  getBillingById,
  createBilling,
  updateBilling,
  updateBillingPayment,
  deleteBilling,
  createBulkProductsAndBilling
} from './billing.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';


import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage()
});

const router = express.Router();


router.get('/', verifyToken, getBillings);
router.get('/:id', verifyToken, getBillingById);
router.post('/', verifyToken, createBilling);
router.put('/:id', verifyToken, updateBilling);
router.put('/payment/:id', verifyToken, updateBillingPayment);
router.delete('/:id', verifyToken, deleteBilling);
router.post('/bulk', upload.single("file"), createBulkProductsAndBilling);


export default router;
