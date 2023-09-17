const mongoose = require('mongoose');
const validator = require('validator');

const witdrawSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    paypalEmail: {
        type: String,
        required: true,
        validate: [validator.isEmail, 'Please provide a valid email'],
    },
    userType: {
        type: String,
        required: true,
        enum: ["Business", "Salon", "Consultation"]
    },
    price: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ["Success", "Failed", "Pending" ]
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    
});

const Withdraw = mongoose.model('withdraw-requests', witdrawSchema);

module.exports = Withdraw;