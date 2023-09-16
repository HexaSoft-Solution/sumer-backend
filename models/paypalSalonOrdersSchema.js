const mongoose = require('mongoose');

const paypalSalonOrdersSchema = new mongoose.Schema({
    orderID: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
    },
    bookingId: {
        type: String,
        required: true,
    },
    salonId: {
        type: String,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
});

const PaypalSalonOrders = mongoose.model('PaypalSalonOrders', paypalSalonOrdersSchema);

module.exports = PaypalSalonOrders;