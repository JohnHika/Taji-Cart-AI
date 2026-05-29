import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  discount: Number,
  stock: Number,
  unit: String
}, { strict: false });

const Product = mongoose.model('Product', ProductSchema);

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/taji_cart');
  const prod = await Product.findOne({ name: /SOFT AFRO BULK/i }).lean();
  console.log('Product found:', JSON.stringify(prod, null, 2));
  
  if (prod && (!prod.price || prod.price === 0)) {
    console.log('\nUpdating price to 1500...');
    await Product.updateOne({ _id: prod._id }, { $set: { price: 1500 } });
    console.log('Price updated!');
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
