import React from 'react';

function Checkout({ items }) {
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
