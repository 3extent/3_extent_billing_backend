import express from 'express';
import {
  getUsers,
  loginUser,
  createUser,
  getUserById,
  updateUser,
  updateUserPayment,
  addPartUser,
  getUserParts,
} from './user.controller.mjs';
import { verifyToken } from '../../middlewares/authMiddleware.mjs';
const router = express.Router();

router.get('/', verifyToken, getUsers);
router.post('/login', loginUser);
router.post('/', verifyToken, createUser);
router.get('/:id', verifyToken, getUserById);
router.put('/:id', verifyToken, updateUser);
router.put('/payment/:id', verifyToken, updateUserPayment);
router.post('/parts', verifyToken, addPartUser);
router.get("/parts", getUserParts );



export default router;