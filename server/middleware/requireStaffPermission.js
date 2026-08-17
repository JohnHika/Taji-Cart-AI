import UserModel from '../models/user.model.js';
import { hasStaffPermission } from '../utils/staffPermissions.js';

// permission may be a single permission id, or an array of ids where any one
// grants access (e.g. a route that serves both "view own" and "view all").
export const requireStaffPermission = (permission) => async (req, res, next) => {
  try {
    const user = req.user || await UserModel.findById(req.userId);
    const required = Array.isArray(permission) ? permission : [permission];
    if (!user || !required.some((p) => hasStaffPermission(user, p))) {
      return res.status(403).json({ success: false, message: `Permission required: ${required.join(' or ')}` });
    }
    req.staffPermissions = user.isAdmin || user.role === 'admin' ? ['*'] : undefined;
    next();
  } catch (error) {
    next(error);
  }
};
