const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    status:{
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending',
    },
    price: {
        type: Number,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
});

transactionSchema.pre(/^find/, function (next) {

    this.populate('product');

    next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;