export const pricewithDiscount = (price, dis = 0, royalDiscount = 0) => {
    // Guard against null/undefined/NaN prices
    const safePrice = Number(price) || 0;
    const safeDiscount = Number(dis) || 0;
    const safeRoyalDiscount = Number(royalDiscount) || 0;
    
    // Early return if price is invalid
    if (safePrice <= 0) return 0;
    
    // First apply the product discount
    const productDiscountAmount = Math.round((safePrice * safeDiscount) / 100);
    const priceAfterProductDiscount = safePrice - productDiscountAmount;
    
    // Then apply the royal card discount to the already discounted price
    const royalDiscountAmount = Math.round((priceAfterProductDiscount * safeRoyalDiscount) / 100);
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