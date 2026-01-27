import express from 'express';
import {
  getUsers,
  loginUser,
  createUser,
  getUserById,
  updateUser,
  updateUserPayment
} from './user.controller.mjs';

const router = express.Router();

router.get('/', getUsers);
router.post('/login', loginUser);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.put('/payment/:id', updateUserPayment);

export default router;