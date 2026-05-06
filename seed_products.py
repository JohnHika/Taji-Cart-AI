#!/usr/bin/env python3
"""
Script to process NAWIRI STOCK 2026.xlsx and prepare data for MongoDB seeding
"""

import pandas as pd
import json
from collections import defaultdict

def process_excel_data():
    """Process the Excel file and convert to structured JSON for MongoDB"""

    # Read the Excel file
    df = pd.read_excel('C:/Projects/Taji-Cart-AI/NAWIRI STOCK 2026.xlsx')

    # Clean the data - fill NaN values with empty strings
    df = df.fillna('')

    # Group products by their HAIR TYPE (parent product)
    products_by_type = defaultdict(list)

    current_product_type = ''

    for index, row in df.iterrows():
        hair_type = row['HAIR TYPE'].strip()
        variant_info = row['Unnamed: 1'].strip()
        quantity = int(float(row['QUANTITY'])) if pd.notna(row['QUANTITY']) and row['QUANTITY'] != '' else 0

        # If we encounter a new hair type, update current product type
        if hair_type:
            current_product_type = hair_type

        # Skip empty rows
        if not variant_info:
            continue

        # Parse variant information
        # Format seems to be: color/length/density or just color
        variant_parts = variant_info.split('/')

        variant_data = {}
        if len(variant_parts) == 1:
            # Just color
            variant_data = {
                'color': variant_parts[0],
                'length': '',
                'density': ''
            }
        elif len(variant_parts) == 2:
            # Could be color/length or color/density
            variant_data = {
                'color': variant_parts[0],
                'length': variant_parts[1],
                'density': ''
            }
        elif len(variant_parts) >= 3:
            # color/length/density
            variant_data = {
                'color': variant_parts[0],
                'length': variant_parts[1],
                'density': variant_parts[2]
            }

        # Create product structure
        # Use current_product_type for handle if hair_type is empty
        effective_hair_type = current_product_type if not hair_type else hair_type

        # Generate unique barcode - use a combination of product type and variant
        barcode_base = effective_hair_type.replace(' ', '').upper() + variant_info.replace('/', '')
        # Generate a simple unique barcode (in real scenario, use proper barcode generation)
        barcode = f"NAW{hash(barcode_base) % 1000000:06d}"

        product_data = {
            'handle': effective_hair_type.lower().replace(' ', '-').replace('INCH', 'inch'),
            'name': current_product_type,
            'sku': f"{effective_hair_type.replace(' ', '-').upper()}-{variant_info.replace('/', '-')}",
            'barcode': barcode,
            'qrCode': f"QR{hash(barcode_base + 'qr') % 1000000:06d}",
            'variants': variant_data,
            'image': [],
            'imageFilename': '',
            'category': [],
            'subCategory': [],
            'unit': 'piece',
            'costPrice': 0,  # Placeholder - will need actual values
            'price': 0,      # Placeholder - will need actual values
            'discount': 0,
            'stock': quantity,
            'weight': 0,     # Placeholder
            'description': f"{current_product_type} - {variant_info}",
            'more_details': {},
            'publish': True,
            'ratings': [],
            'averageRating': 0
        }

        products_by_type[current_product_type].append(product_data)

    # Convert to list of all products
    all_products = []
    for product_type, variants in products_by_type.items():
        all_products.extend(variants)

    return all_products

def save_to_json(products, filename='products_seed.json'):
    """Save products to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(products)} products to {filename}")

if __name__ == '__main__':
    print("Processing NAWIRI STOCK 2026.xlsx...")
    products = process_excel_data()

    print(f"Found {len(products)} product variants")

    # Show some sample data
    print("\nSample products:")
    for i, product in enumerate(products[:3]):
        print(f"\n{i+1}. {product['name']} - {product['variants']}")
        print(f"   SKU: {product['sku']}")
        print(f"   Stock: {product['stock']}")

    save_to_json(products)
    print("\nReady to seed into MongoDB!")