const mongoose = require('mongoose')

const businessOrderSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
    }],
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    status: [{
        type: String,
        enum: ['Placed', 'Dispatched', "On Way", "Received"],
    }],
    total: {
        type: Number,
        required: true
    },
});


const BusinessOrders = mongoose.model('BusinessOrder', businessOrderSchema);

module.exports = BusinessOrders;