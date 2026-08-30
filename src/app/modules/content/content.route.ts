import { Router } from 'express';
import { contentController } from './content.controller';
import { authenticate } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';

const router = Router();

router.get(
  '/',
  authenticate,
  contentController.getAllContents
);

router.post(
  '/',
  authenticate,
  requirePermission('create_content'),
  contentController.createContent
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('edit_content'),
  contentController.updateContent
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('delete_content'),
  contentController.deleteContent
);

export const contentRoutes = router;
