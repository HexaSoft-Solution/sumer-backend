const mongoose = require('mongoose')

const businessOrderSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
    }],
    total: {
        type: Number,
        required: true
    },
});


const BusinessOrders = mongoose.model('BusinessOrder', businessOrderSchema);

module.exports = BusinessOrders;