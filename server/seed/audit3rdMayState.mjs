import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import mongoose from 'mongoose';

import ProductModel from '../models/product.model.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.resolve(__dirname, '../../NAWIRI STOCK 2026.xlsx');
const REPORT_PATH = path.resolve(__dirname, '../../3rdmay-audit-report.json');
const SHEET_NAME = '3RDMAY';

function normalizeHairType(value = '') {
	return String(value ?? '')
		.replace(/[—–]/g, '-')
		.replace(/["“”]/g, '')
		.replace(/\b(\d+)\s*INCH(?:ES)?\b/gi, '$1INCH')
		.replace(/\s+/g, ' ')
		.trim()
		.toUpperCase();
}

function normalizeColor(value = '') {
	return String(value ?? '')
		.replace(/[—–]/g, '-')
		.replace(/["“”]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toUpperCase();
}

function buildCanonicalKey(hairType, color) {
	const normalizedHairType = normalizeHairType(hairType);
	const normalizedColor = normalizeColor(color);

	if (!normalizedHairType || !normalizedColor) {
		return '';
	}

	return `${normalizedHairType}::${normalizedColor}`;
}

function buildDesiredName(hairType, color) {
	return `${normalizeHairType(hairType)} - ${normalizeColor(color)}`;
}

function extractIdentityFromName(name = '') {
	const normalizedName = String(name ?? '')
		.replace(/[—–]/g, '-')
		.replace(/["“”]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	const parts = normalizedName.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
	if (parts.length < 2) {
		return null;
	}

	const hairType = normalizeHairType(parts[0]);
	const color = normalizeColor(parts[1]);
	const key = buildCanonicalKey(hairType, color);

	if (!key) {
		return null;
	}

	return { hairType, color, key };
}

function parseSheet() {
	const workbook = XLSX.readFile(XLSX_PATH);
	const worksheet = workbook.Sheets[SHEET_NAME];

	if (!worksheet) {
		throw new Error(`Sheet "${SHEET_NAME}" not found in workbook`);
	}

	const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 });
	const itemsByKey = new Map();
	let currentHairType = '';

	for (let index = 1; index < rows.length; index += 1) {
		const [col0, col1, col2] = rows[index];
		const hairType = String(col0 ?? '').trim();
		const color = String(col1 ?? '').trim();
		const stock = parseInt(String(col2 ?? '').replace(/[^0-9]/g, ''), 10);

		if (hairType) {
			currentHairType = normalizeHairType(hairType);
		}

		if (!currentHairType || !color || Number.isNaN(stock)) {
			continue;
		}

		const normalizedColor = normalizeColor(color);
		const key = buildCanonicalKey(currentHairType, normalizedColor);

		itemsByKey.set(key, {
			key,
			hairType: currentHairType,
			color: normalizedColor,
			name: buildDesiredName(currentHairType, normalizedColor),
			stock,
		});
	}

	return Array.from(itemsByKey.values());
}

function analyzeState(sheetItems, products) {
	const sheetKeys = new Set(sheetItems.map((item) => item.key));
	const productsByKey = new Map();
	const exactNameGroups = new Map();

	products.forEach((product) => {
		const identity = extractIdentityFromName(product.name);
		if (identity && sheetKeys.has(identity.key)) {
			if (!productsByKey.has(identity.key)) {
				productsByKey.set(identity.key, []);
			}

			productsByKey.get(identity.key).push(product);
		}

		const normalizedName = String(product.name || '').trim().toLowerCase();
		if (!normalizedName) {
			return;
		}

		if (!exactNameGroups.has(normalizedName)) {
			exactNameGroups.set(normalizedName, []);
		}

		exactNameGroups.get(normalizedName).push(product);
	});

	const report = {
		generatedAt: new Date().toISOString(),
		sheetName: SHEET_NAME,
		totalSheetItems: sheetItems.length,
		totalProductsInDb: products.length,
		missingProducts: [],
		duplicateCanonicalProducts: [],
		stockMismatches: [],
		globalExactNameDuplicates: [],
		productsNotInSheet: [],
		summary: {
			missingProducts: 0,
			duplicateCanonicalProducts: 0,
			stockMismatches: 0,
			globalExactNameDuplicates: 0,
			productsNotInSheet: 0,
		},
	};

	sheetItems.forEach((item) => {
		const matches = productsByKey.get(item.key) || [];

		if (!matches.length) {
			report.missingProducts.push({
				key: item.key,
				name: item.name,
				expectedStock: item.stock,
			});
			return;
		}

		if (matches.length > 1) {
			report.duplicateCanonicalProducts.push({
				key: item.key,
				name: item.name,
				count: matches.length,
				products: matches.map((product) => ({
					id: String(product._id),
					name: product.name,
					stock: product.stock,
					sku: product.sku || '',
				})),
			});
		}

		const exactMatches = matches.filter(
			(product) => String(product.name || '').trim().toLowerCase() === item.name.toLowerCase()
		);

		if (!exactMatches.length) {
			report.stockMismatches.push({
				key: item.key,
				name: item.name,
				reason: 'No exact canonical sheet name in DB',
				expectedStock: item.stock,
				actualProducts: matches.map((product) => ({
					id: String(product._id),
					name: product.name,
					stock: product.stock,
				})),
			});
			return;
		}

		const distinctStocks = [...new Set(exactMatches.map((product) => Number(product.stock)))];
		if (distinctStocks.length !== 1 || distinctStocks[0] !== Number(item.stock)) {
			report.stockMismatches.push({
				key: item.key,
				name: item.name,
				expectedStock: item.stock,
				actualStocks: distinctStocks,
				actualProducts: exactMatches.map((product) => ({
					id: String(product._id),
					name: product.name,
					stock: product.stock,
				})),
			});
		}
	});

	for (const [normalizedName, group] of exactNameGroups.entries()) {
		if (group.length <= 1) {
			continue;
		}

		report.globalExactNameDuplicates.push({
			name: normalizedName,
			count: group.length,
			products: group.map((product) => ({
				id: String(product._id),
				name: product.name,
				stock: product.stock,
				sku: product.sku || '',
			})),
		});
	}

	report.productsNotInSheet = products
		.filter((product) => {
			const identity = extractIdentityFromName(product.name);
			return !identity || !sheetKeys.has(identity.key);
		})
		.map((product) => ({
			id: String(product._id),
			name: product.name,
			stock: product.stock,
			sku: product.sku || '',
		}));

	report.summary.missingProducts = report.missingProducts.length;
	report.summary.duplicateCanonicalProducts = report.duplicateCanonicalProducts.length;
	report.summary.stockMismatches = report.stockMismatches.length;
	report.summary.globalExactNameDuplicates = report.globalExactNameDuplicates.length;
	report.summary.productsNotInSheet = report.productsNotInSheet.length;

	return report;
}

async function main() {
	await mongoose.connect(process.env.MONGODB_URI);

	const sheetItems = parseSheet();
	const products = await ProductModel.find({})
		.select('name stock sku createdAt updatedAt')
		.lean();

	const report = analyzeState(sheetItems, products);
	await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

	await mongoose.disconnect();
	console.log(`Audit report written to ${REPORT_PATH}`);
}

main().catch(async (error) => {
	console.error(error);
	try {
		await mongoose.disconnect();
	} catch {
		// noop
	}
	process.exit(1);
});
