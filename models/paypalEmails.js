const mongoose = require('mongoose');

const paypalEmailSchema = new mongoose.Schema({
    paypalEmail: {
        type: String,
        required: true,
    },
});

const PaypalEmails = mongoose.model('paypal-emails', paypalEmailSchema);

module.exports = PaypalEmails;