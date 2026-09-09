import mongoose from "mongoose";

// Matatu SACCOs and long-distance coach operators that run their own parcel/
// courier service alongside passenger transport. Customers hand a parcel to
// the operator's Nairobi terminal/office and the receiver collects it at the
// destination town's terminal — the operator's own parcel fee is paid
// directly to them, separate from anything charged here.
const saccoOperatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Provide operator name"],
        trim: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['matatu_sacco', 'coach'],
        default: 'matatu_sacco'
    },
    // Towns/countries this operator's parcel service reaches — shown to the
    // customer so they can confirm their destination is covered.
    destinationsServed: {
        type: [String],
        default: []
    },
    // True once a route crosses into another country (Tanzania, Uganda, etc.)
    isCrossBorder: {
        type: Boolean,
        default: false
    },
    nairobiTerminal: {
        type: String,
        trim: true,
        default: ''
    },
    contactPhone: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

const SaccoOperatorModel = mongoose.model('saccoOperator', saccoOperatorSchema)

export default SaccoOperatorModel
