import express from 'express';
import {
  getBrands,
  createBrand,
  getBrandById,
  updateBrand
} from './brand.controller.mjs';

const router = express.Router();

router.get('/', getBrands);
router.post('/', createBrand);
router.get('/:id', getBrandById);
router.put('/:id', updateBrand);

export default router;
