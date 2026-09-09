import mongoose from 'mongoose';

// Generic atomic sequence counter. Used to hand out gap-free, collision-free
// numbers (e.g. per-day sale numbers) under concurrent requests — a
// findOne-then-compute-next approach races when two requests read the same
// "last" value before either has saved, producing duplicate numbers.
const counterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model('counter', counterSchema);

// Atomically increments and returns the new value for the given key.
// $inc is a single atomic operation in MongoDB, so concurrent callers each
// get a distinct, strictly increasing seq — no read-then-write race.
export const getNextSequence = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export default Counter;
