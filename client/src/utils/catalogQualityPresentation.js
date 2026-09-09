export const getCatalogVisibilityCopy = (hideIncompleteProducts) =>
  hideIncompleteProducts
    ? {
        status: 'Customer protection is on',
        description: 'Products without a usable image or a price above KSh 0 are hidden from customers.',
      }
    : {
        status: 'Customer protection is off',
        description: 'Incomplete published products can appear in the customer storefront.',
      };
