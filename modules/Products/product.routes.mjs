import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  createBulkProducts,
  removeProduct,
  updateProduct,
  updateProductForRepair
} from './product.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

router.get('/', verifyToken, getProducts);
router.get('/:id', verifyToken, getProductById);
router.post('/', verifyToken, createProduct);
router.post('/bulk', verifyToken, createBulkProducts);
router.delete('/:id', verifyToken, removeProduct);
router.put('/:id', verifyToken, updateProduct);
router.put('/:id/repair', verifyToken, updateProductForRepair);

export default router;
