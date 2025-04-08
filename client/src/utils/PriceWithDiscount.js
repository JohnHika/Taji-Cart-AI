export const pricewithDiscount = (price, dis = 0, royalDiscount = 0) => {
    // First apply the product discount
    const productDiscountAmount = Math.round((Number(price) * Number(dis)) / 100);
    const priceAfterProductDiscount = Number(price) - Number(productDiscountAmount);
    
    // Then apply the royal card discount to the already discounted price
    const royalDiscountAmount = Math.round((priceAfterProductDiscount * Number(royalDiscount)) / 100);
    const finalPrice = priceAfterProductDiscount - royalDiscountAmount;
    
    return finalPrice;
}

// Get the royal card discount percentage based on tier
export const getRoyalCardDiscount = (tier) => {
    switch(tier) {
        case 'Bronze':
            return 2;
        case 'Silver':
            return 3;
        case 'Gold':
            return 5;
        case 'Platinum':
            return 7;
        default:
            return 0; // Basic tier or no tier
    }
}