import axios from 'axios';
import https from 'https';
import dns from 'dns';

const BASE_URL = process.env.PESAPAL_BASE_URL || 'https://cybqa.pesapal.com/pesapalv3';
const TOKEN_URL = `${BASE_URL}/api/Auth/RequestToken`;
const SUBMIT_ORDER_URL = `${BASE_URL}/api/Transactions/SubmitOrderRequest`;
const STATUS_URL = `${BASE_URL}/api/Transactions/GetTransactionStatus`;

try {
	if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
} catch {}

const httpsAgent = new https.Agent({ keepAlive: true });

const httpClient = axios.create({
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
	httpsAgent,
});

console.log('Pesapal config ready', {
	baseUrl: BASE_URL,
	tokenUrl: TOKEN_URL,
	submitUrl: SUBMIT_ORDER_URL,
	statusUrl: STATUS_URL,
	keySet: Boolean(process.env.PESAPAL_CONSUMER_KEY),
	secretSet: Boolean(process.env.PESAPAL_CONSUMER_SECRET),
});

async function getAccessToken() {
	try {
		console.log('Requesting Pesapal token');
		const { data } = await httpClient.post(TOKEN_URL, {
			consumer_key: process.env.PESAPAL_CONSUMER_KEY,
			consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
		});
		console.log('Pesapal token response', data);
		return data.token;
	} catch (err) {
		const details = err?.response?.data || err.message;
		console.error('Pesapal token error', details);
		const error = new Error('Failed to get Pesapal access token');
		error.response = { status: err?.response?.status, data: details };
		throw error;
	}
}

async function submitOrder({
	id,
	currency,
	amount,
	description,
	callback_url,
	notification_id,
	billing_address,
}) {
	const token = await getAccessToken();
	try {
		console.log('Submitting Pesapal order');
		const payload = {
			id,
			currency,
			amount: parseFloat(amount),
			description,
			callback_url,
			notification_id,
			billing_address,
		};
		console.log('Submit payload', payload);
		const res = await httpClient.post(SUBMIT_ORDER_URL, payload, {
			headers: { Authorization: `Bearer ${token}` },
		});
		const data = res.data || {};
		console.log('Submit response', data);
		if (data?.error) {
			const error = new Error(data.error.message || 'Pesapal submit error');
			error.response = { status: res.status, data };
			throw error;
		}
		return data;
	} catch (err) {
		const details = err?.response?.data || err.message;
		console.error('Pesapal submit error', details);
		const error = new Error('Failed to submit Pesapal order');
		error.response = { status: err?.response?.status, data: details };
		throw error;
	}
}

async function getTransactionStatus(orderTrackingId) {
	const token = await getAccessToken();
	try {
		const params = new URLSearchParams({ orderTrackingId });
		const ipn = process.env.PESAPAL_NOTIFICATION_ID;
		const isUuid = typeof ipn === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(ipn);
		if (isUuid) params.append('ipnId', ipn);
		const { data } = await httpClient.get(`${STATUS_URL}?${params.toString()}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		return data;
	} catch (err) {
		const details = err?.response?.data || err.message;
		console.error('Pesapal status error', details);
		const error = new Error('Failed to get Pesapal transaction status');
		error.response = { status: err?.response?.status, data: details };
		throw error;
	}
}

export { getAccessToken, submitOrder, getTransactionStatus };
