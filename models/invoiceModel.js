const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        unique: true,
        required: true,
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
    }],
    paymentId: {
        type: String,
    },
    totalAmount: {
        type: Number,
        required: true,
    },

    paypalId: {
        type: String,
        default: ""
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

invoiceSchema.pre(/^find/, function (next) {

    this.populate('transactions')

    next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
