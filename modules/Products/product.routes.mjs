import express from 'express';
import {
  getProducts,
  createProduct,
  removeProduct
} from './product.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, createProduct);
router.delete('/:id', verifyToken, removeProduct);

export default router;
