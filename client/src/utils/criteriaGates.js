const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const buildRequirement = (key, label, message, options = {}) => ({
  key,
  label,
  message,
  fixType: options.fixType || 'info',
  fields: options.fields || [],
  redirectTo: options.redirectTo || '',
  actionLabel: options.actionLabel || '',
});

const getDeliveryProfile = (user = {}) => user?.deliveryProfile || null;

const requireName = (user = {}) => (
  hasText(user?.name)
    ? null
    : buildRequirement('name', 'Full name', 'Add your full name before continuing.', {
        fixType: 'profile',
        fields: ['name'],
      })
);

const requireEmail = (user = {}) => (
  hasText(user?.email)
    ? null
    : buildRequirement('email', 'Email address', 'Add an email address before continuing.', {
        fixType: 'profile',
        fields: ['email'],
      })
);

const requireMobile = (user = {}) => (
  hasText(user?.mobile)
    ? null
    : buildRequirement('mobile', 'Phone number', 'Add a phone number before continuing.', {
        fixType: 'profile',
        fields: ['mobile'],
      })
);

const requireDriverPhone = (user = {}) => {
  const deliveryProfile = getDeliveryProfile(user);
  const driverPhone = deliveryProfile?.phoneNumber || user?.mobile;

  return hasText(driverPhone)
    ? null
    : buildRequirement(
        'driver_phone',
        'Driver phone number',
        'Add a working driver phone number before using delivery actions.',
        {
          fixType: 'profile',
          fields: ['mobile'],
        }
      );
};

const requireDriverVerified = (user = {}) => {
  const deliveryProfile = getDeliveryProfile(user);
  const verificationStatus = deliveryProfile?.verificationStatus || 'pending';

  if (verificationStatus === 'verified') {
    return null;
  }

  if (verificationStatus === 'rejected') {
    return buildRequirement(
      'driver_verified',
      'Driver verification',
      'Your delivery profile was rejected. This requires an administrator to review it again — please contact support so they can update your verification status.',
      {
        fixType: 'external',
        redirectTo: '/dashboard/profile',
        actionLabel: 'Open profile',
      }
    );
  }

  return buildRequirement(
    'driver_verified',
    'Driver verification',
    'Your delivery profile is still awaiting admin approval. This is not something you can complete yourself — an administrator needs to verify your driver account before you can claim deliveries.',
    {
      fixType: 'external',
      redirectTo: '/dashboard/profile',
      actionLabel: 'View my account',
    }
  );
};

const requireDriverActive = (user = {}) => {
  const deliveryProfile = getDeliveryProfile(user);

  return deliveryProfile?.isActive === false
    ? buildRequirement(
        'driver_active',
        'Active delivery account',
        'Your delivery account is inactive right now. Please contact an administrator before continuing.',
        {
          fixType: 'external',
          redirectTo: '/dashboard/profile',
          actionLabel: 'Open profile',
        }
      )
    : null;
};

export const TASK_REQUIREMENTS = {
  privileged_workspace: {
    title: 'Complete your account details',
    description: 'Add the missing account details below before continuing in the staff workspace.',
    checks: [requireName, requireEmail, requireMobile],
  },
  delivery_workspace: {
    title: 'Complete your delivery details',
    description: 'Add the missing delivery account details below before continuing.',
    checks: [requireName, requireEmail, requireMobile, requireDriverPhone],
  },
  checkout: {
    title: 'Complete your checkout details',
    description: 'We need a few missing details before you can place this order.',
    checks: [requireName, requireEmail, requireMobile],
  },
  dispatch_order: {
    title: 'Complete your dispatch details',
    description: 'Add the missing staff details below before dispatching or assigning a driver.',
    checks: [requireName, requireEmail, requireMobile],
  },
  delivery_progress: {
    title: 'Complete your delivery requirements',
    description: 'Sort out the missing delivery requirements below before updating this order.',
    checks: [requireName, requireEmail, requireMobile, requireDriverPhone, requireDriverVerified, requireDriverActive],
  },
};

export const evaluateCriteria = (user = {}, taskKey) => {
  const task = TASK_REQUIREMENTS[taskKey];

  if (!task) {
    return {
      allowed: true,
      taskKey,
      title: '',
      description: '',
      requirements: [],
    };
  }

  const requirements = task.checks
    .map((check) => check(user))
    .filter(Boolean);

  return {
    allowed: requirements.length === 0,
    taskKey,
    title: task.title,
    description: task.description,
    requirements,
  };
};

export const getRouteGateTaskKey = ({ requireAdmin = false, requireStaff = false, requireDelivery = false } = {}) => {
  if (requireDelivery) {
    return 'delivery_workspace';
  }

  if (requireAdmin || requireStaff) {
    return 'privileged_workspace';
  }

  return null;
};
