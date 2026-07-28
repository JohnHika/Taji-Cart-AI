import UserModel from '../models/user.model.js';
import { hasStaffPermission } from '../utils/staffPermissions.js';

export const requireStaffPermission = (permission) => async (req, res, next) => {
  try {
    const user = req.user || await UserModel.findById(req.userId);
    if (!user || !hasStaffPermission(user, permission)) {
      return res.status(403).json({ success: false, message: `Permission required: ${permission}` });
    }
    req.staffPermissions = user.isAdmin || user.role === 'admin' ? ['*'] : undefined;
    next();
  } catch (error) {
    next(error);
  }
};
