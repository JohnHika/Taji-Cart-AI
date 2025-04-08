import React from 'react';

function Checkout({ items }) {
    // After successful payment/checkout
    const handleSuccessfulPayment = (data) => {
        // Format receipt data
        const receiptItems = [
            `Order ID: ${data.orderId}`,
            `Amount: ${data.amount}`,
            `Date: ${new Date().toLocaleDateString()}`,
            // Add more receipt details as needed
        ];

        // Navigate with state
        navigate('/success', { 
            state: { 
                receipt: receiptItems,
                text: "Payment" 
            } 
        });
    };

    return (
        <div>
            <h1>Checkout</h1>
            {/* Render items */}
            {items.map((item, index) => (
                <div key={index}>{item.name}</div>
            ))}
        </div>
    );
}

export default Checkout;
