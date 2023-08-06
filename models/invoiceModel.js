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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
