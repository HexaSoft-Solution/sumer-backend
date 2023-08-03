const mongoose = require('mongoose');


const voucherSchema  = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        required: true
    },
    discountPercentage: {
        type: Number,
        required: true,
        max: 80,
    },
    maxDiscount: {
        type: Number,
        required: true
    },
    expireDate: {
        type: Date,
        required: true
    },
    used: {
        type: Boolean,
        default: false
    },
    owned: {
        type: Boolean,
        default: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
},
{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

const Voucher = mongoose.model('Voucher', voucherSchema);

module.exports = Voucher;