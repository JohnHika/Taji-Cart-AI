// Clerk configuration file for authentication
// This reads the Clerk publishable key from the .env file

// Get the publishable key from Vite environment variables
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 
  import.meta.env.CLERK_PUBLISHABLE_KEY || '';// Configure appearance for Clerk components
export const clerkAppearance = {
  layout: {
    // You can customize the layout here
    socialButtonsVariant: 'iconButton',
    socialButtonsPlacement: 'bottom',
  },
  variables: {
    colorPrimary: '#22c55e', // Using green to match your Taji-Cart-AI theme
    colorText: '#000000',
    colorBackground: '#ffffff',
    fontFamily: 'Inter, sans-serif',
  },
  elements: {
    formButtonPrimary: 'bg-green-800 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white py-2 rounded font-semibold tracking-wide transition-colors duration-200',
    card: 'bg-white/60 dark:bg-gray-900/80 backdrop-blur-md rounded p-7 shadow-lg',
    formFieldInput: 'bg-blue-50 dark:bg-gray-800 p-2 border dark:border-gray-700 rounded outline-none w-full',
    socialButtonsBlockButton: 'border border-gray-300 dark:border-gray-600 rounded',
  }
};

// Function to transform Clerk user to your app's user format
export const transformClerkUser = (user) => {
  if (!user) return null;
  
  return {
    _id: user.id,
    name: user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username || 'User',
    email: user.emailAddresses?.[0]?.emailAddress || '',
    avatar: user.imageUrl || '',
    verify_email: true, // Email is verified through Clerk
    authType: 'clerk',
    role: 'user', // Default role
  };
};