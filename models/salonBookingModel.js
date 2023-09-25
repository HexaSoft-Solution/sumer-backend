const mongoose = require('mongoose');

const salonBookingModel = new mongoose.Schema({
    startTime: {
        type: String,
        enum: ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
        required: true
    },
    endTime: {
        type: String,
        enum: ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
        required: true,
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Unpaid'],
        default: 'Unpaid'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    service: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
})

const SalonBooking = mongoose.model('SalonBooking', salonBookingModel);

module.exports = SalonBooking;