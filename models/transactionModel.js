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
    status: [{
        status: {
            type: String,
            enum: ['Placed', 'Dispatched', "On Way", "Received"],
        },
        date:{
            type: Date,
            default: Date.now(),
        }
    }],
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