import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = Router();

// AppController endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// UserController endpoints
router.post('/users', UsersController.postNew);

export default router;
