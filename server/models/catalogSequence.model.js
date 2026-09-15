import mongoose from 'mongoose';

const catalogSequenceSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

const CatalogSequenceModel = mongoose.model('catalogSequence', catalogSequenceSchema);

export default CatalogSequenceModel;
