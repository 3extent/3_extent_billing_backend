import express from 'express';
import {
  getBrands,
  createBrand,
  getBrandById,
  updateBrand
} from './brand.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';

const router = express.Router();

router.get('/', verifyToken, getBrands);
router.post('/', verifyToken, createBrand);
router.get('/:id', verifyToken, getBrandById);
router.put('/:id', verifyToken, updateBrand);

export default router;
