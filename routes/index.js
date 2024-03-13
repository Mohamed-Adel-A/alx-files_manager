import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

const router = Router();

// AppController endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// UserController endpoints
router.post('/users', UsersController.postNew);

// Authenticate a user endpoints
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

export default router;
