const mongoose = require('mongoose');

const paypalConsultationOrdersSchema = new mongoose.Schema({
    orderID: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
    },
    consultationId: {
        type: String,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    }
});

const PaypalConsultationOrders = mongoose.model('PaypalConsultationOrders', paypalConsultationOrdersSchema);

module.exports = PaypalConsultationOrders;