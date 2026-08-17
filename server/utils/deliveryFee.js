import mongoose from 'mongoose';
import DeliveryZoneModel from '../models/deliveryzone.model.js';
import { DEFAULT_DELIVERY_CHARGE, SACCO_TERMINAL_DROPOFF_CHARGE } from './cbdDelivery.js';

// Bike (zone-fare) delivery never trusts a client-supplied amount — the
// fare is always looked up server-side from the active DeliveryZone doc.
export const resolveBikeDeliveryZone = async (deliveryZoneId) => {
  if (!deliveryZoneId || !mongoose.Types.ObjectId.isValid(String(deliveryZoneId))) {
    return { zone: null, error: 'Please select a delivery zone for bike delivery.' };
  }

  const zone = await DeliveryZoneModel.findOne({ _id: deliveryZoneId, isActive: true });

  if (!zone) {
    return { zone: null, error: 'Selected delivery zone is no longer available. Please pick another zone.' };
  }

  return { zone, error: null };
};

// Resolves the authoritative delivery charge for an order/sale server-side.
// fulfillmentType: 'delivery' | 'sacco_pickup' | 'pickup' | 'in_store' | ...
// deliveryZone: an already-resolved DeliveryZoneModel doc (bike mode) or null.
export const resolveDeliveryCharge = ({ fulfillmentType, deliveryZone }) => {
  if (fulfillmentType === 'delivery') {
    return deliveryZone ? deliveryZone.fare : DEFAULT_DELIVERY_CHARGE;
  }
  if (fulfillmentType === 'sacco_pickup') {
    return SACCO_TERMINAL_DROPOFF_CHARGE;
  }
  return 0;
};
