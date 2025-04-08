import express from 'express';
import stripePackage from 'stripe';

const stripe = stripePackage('your_stripe_secret_key');
const stripeRouter = express.Router();

// Endpoint to create a payment intent
stripeRouter.post('/create-payment-intent', async (req, res) => {
    try {
        console.log('Received request to create payment intent:', req.body);
        const { amount, currency } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
        });

        console.log('Payment intent created:', paymentIntent);
        res.status(200).send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ error: error.message });
    }
});

// Endpoint to handle webhook events
stripeRouter.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = 'your_webhook_secret';

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log('Webhook event received:', event);
    } catch (err) {
        console.error('Webhook error:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful:', paymentIntent);
            break;
        // Add more event types as needed
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

export default stripeRouter;