import express from 'express';
import {
  getProducts,
  createProduct,
  removeProduct
} from './product.controller.mjs';

const router = express.Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.delete('/:id', removeProduct);

export default router;
