import ProductModel from '../models/product.model.js';
import SupplierModel from '../models/supplier.model.js';
import PurchaseOrderModel from '../models/purchaseOrder.model.js';
import AdminActionLogModel from '../models/adminActionLog.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';

const asPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const poNumber = () => `PO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const audit = (payload) => AdminActionLogModel.create(payload).catch((error) => {
  console.error('Failed to write procurement audit record:', error);
});

export const getProcurementDashboard = async (request, response) => {
  try {
    const [suppliers, supplierList, purchaseOrders] = await Promise.all([
      SupplierModel.countDocuments({ active: true }),
      SupplierModel.find({ active: true }).select('name contactName phone').sort({ name: 1 }).lean(),
      PurchaseOrderModel.find().populate('supplier', 'name').sort({ createdAt: -1 }).limit(40).lean(),
    ]);
    const openOrders = purchaseOrders.filter((order) => ['draft', 'ordered', 'partially_received'].includes(order.status));
    const inboundUnits = openOrders.reduce((total, order) => total + order.lines.reduce((lineTotal, line) => lineTotal + Math.max(0, line.orderedQuantity - line.receivedQuantity), 0), 0);
    return response.json({
      success: true,
      data: { suppliers, supplierList, purchaseOrders, openOrders: openOrders.length, inboundUnits },
    });
  } catch (error) {
    console.error('Failed to load procurement dashboard:', error);
    return response.status(500).json({ success: false, message: 'Unable to load purchasing data.' });
  }
};

export const listSuppliers = async (request, response) => {
  try {
    const suppliers = await SupplierModel.find().sort({ active: -1, name: 1 }).lean();
    return response.json({ success: true, data: suppliers });
  } catch (error) {
    return response.status(500).json({ success: false, message: 'Unable to load suppliers.' });
  }
};

export const createSupplier = async (request, response) => {
  const name = String(request.body?.name || '').trim();
  if (!name) return response.status(400).json({ success: false, message: 'Supplier name is required.' });
  try {
    const supplier = await SupplierModel.create({
      name,
      contactName: String(request.body?.contactName || '').trim(),
      phone: String(request.body?.phone || '').trim(),
      email: String(request.body?.email || '').trim(),
      notes: String(request.body?.notes || '').trim(),
    });
    await audit({ actorType: 'admin', actorId: request.userId, action: 'create_supplier', target: { model: 'Supplier', id: supplier._id }, after: { name: supplier.name } });
    return response.status(201).json({ success: true, data: supplier });
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ success: false, message: 'A supplier with that name already exists.' });
    return response.status(500).json({ success: false, message: 'Supplier could not be created.' });
  }
};

export const createPurchaseOrder = async (request, response) => {
  const supplierId = String(request.body?.supplierId || '').trim();
  const requestedLines = Array.isArray(request.body?.lines) ? request.body.lines : [];
  if (!supplierId || !requestedLines.length) return response.status(400).json({ success: false, message: 'Choose a supplier and at least one product.' });
  if (requestedLines.length > 100) return response.status(400).json({ success: false, message: 'A purchase order can contain at most 100 products.' });

  try {
    const [supplier, products] = await Promise.all([
      SupplierModel.findOne({ _id: supplierId, active: true }).lean(),
      ProductModel.find({ _id: { $in: requestedLines.map((line) => line.productId) } }).select('name sku costPrice').lean(),
    ]);
    if (!supplier) return response.status(404).json({ success: false, message: 'Active supplier not found.' });
    const productsById = new Map(products.map((product) => [String(product._id), product]));
    const lines = requestedLines.map((requested) => {
      const product = productsById.get(String(requested.productId));
      const quantity = asPositiveInt(requested.quantity);
      const cost = Number(requested.unitCost ?? product?.costPrice);
      if (!product || !quantity || !Number.isFinite(cost) || cost < 0) return null;
      return { product: product._id, productName: product.name, sku: product.sku, orderedQuantity: quantity, unitCost: cost };
    });
    if (lines.some((line) => !line) || lines.length !== requestedLines.length) {
      return response.status(400).json({ success: false, message: 'Every line needs a valid product, quantity, and unit cost.' });
    }
    const purchaseOrder = await PurchaseOrderModel.create({
      number: poNumber(), supplier: supplier._id, lines, createdBy: request.userId,
      expectedDate: request.body?.expectedDate || undefined,
      notes: String(request.body?.notes || '').trim(),
    });
    await audit({ actorType: 'admin', actorId: request.userId, action: 'create_purchase_order', target: { model: 'PurchaseOrder', id: purchaseOrder._id }, after: { number: purchaseOrder.number, supplier: supplier.name, lineCount: lines.length } });
    return response.status(201).json({ success: true, data: purchaseOrder });
  } catch (error) {
    console.error('Failed to create purchase order:', error);
    return response.status(500).json({ success: false, message: 'Purchase order could not be created.' });
  }
};

export const markPurchaseOrderOrdered = async (request, response) => {
  try {
    const purchaseOrder = await PurchaseOrderModel.findOneAndUpdate(
      { _id: request.params.id, status: 'draft' },
      { $set: { status: 'ordered', orderedAt: new Date() } },
      { new: true },
    );
    if (!purchaseOrder) return response.status(409).json({ success: false, message: 'Only a draft purchase order can be marked ordered.' });
    await audit({ actorType: 'admin', actorId: request.userId, action: 'order_purchase_order', target: { model: 'PurchaseOrder', id: purchaseOrder._id }, after: { status: purchaseOrder.status } });
    return response.json({ success: true, data: purchaseOrder });
  } catch (error) {
    return response.status(500).json({ success: false, message: 'Purchase order could not be updated.' });
  }
};

export const receivePurchaseOrder = async (request, response) => {
  const receivedLines = Array.isArray(request.body?.lines) ? request.body.lines : [];
  if (!receivedLines.length) return response.status(400).json({ success: false, message: 'Add at least one received quantity.' });
  try {
    const purchaseOrder = await PurchaseOrderModel.findById(request.params.id);
    if (!purchaseOrder || ['draft', 'cancelled', 'received'].includes(purchaseOrder.status)) {
      return response.status(409).json({ success: false, message: 'This purchase order cannot receive stock yet.' });
    }
    const incoming = new Map(receivedLines.map((line) => [String(line.productId), asPositiveInt(line.quantity)]));
    const changes = [];
    for (const line of purchaseOrder.lines) {
      const quantity = incoming.get(String(line.product));
      if (!quantity) continue;
      const remaining = line.orderedQuantity - line.receivedQuantity;
      if (quantity > remaining) return response.status(400).json({ success: false, message: `${line.productName} only has ${remaining} unit(s) left to receive.` });
      changes.push({ line, quantity });
    }
    if (!changes.length) return response.status(400).json({ success: false, message: 'No valid purchase order lines were selected.' });
    for (const { line, quantity } of changes) {
      const product = await ProductModel.findByIdAndUpdate(line.product, { $inc: { warehouseStock: quantity } }, { new: true }).select('name warehouseStock');
      if (!product) return response.status(404).json({ success: false, message: `${line.productName} no longer exists.` });
      line.receivedQuantity += quantity;
    }
    const allReceived = purchaseOrder.lines.every((line) => line.receivedQuantity >= line.orderedQuantity);
    purchaseOrder.status = allReceived ? 'received' : 'partially_received';
    purchaseOrder.receivedAt = new Date();
    await purchaseOrder.save();
    await InventoryMovementModel.insertMany(changes.map(({ line, quantity }) => ({
      product: line.product,
      type: 'purchase_receipt',
      warehouseDelta: quantity,
      reference: { model: 'PurchaseOrder', id: purchaseOrder._id, number: purchaseOrder.number },
      reason: `Received from purchase order ${purchaseOrder.number}`,
      actorId: request.userId,
    })));
    await audit({ actorType: 'admin', actorId: request.userId, action: 'receive_purchase_order', target: { model: 'PurchaseOrder', id: purchaseOrder._id }, after: { status: purchaseOrder.status, lines: changes.map(({ line, quantity }) => ({ product: line.productName, quantity })) } });
    return response.json({ success: true, data: purchaseOrder });
  } catch (error) {
    console.error('Failed to receive purchase order:', error);
    return response.status(500).json({ success: false, message: 'Received stock could not be recorded.' });
  }
};
