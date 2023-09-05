const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A salon must have a name'],
    },
    service: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    about: {
        type: String,
        default: null,
    },
    address:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    }],
    pricePerHour: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    booking: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalonBooking'
    }],
    salonPhoto: String,
    cloudinaryId: String,
    phone: {
        type: String,
        required: [true, 'Please provide your telephone'],
        unique: true,
        validate: {
            validator: function(v) {
                const re = /^01[0125][0-9]{8}$/;
                return (!v || !v.trim().length) || re.test(v)
            },
            message: 'Provided phone number is invalid.'
        },
    },
    promotedAds: {
        type: Number,
        default: 0
    },
    salonReviews: [{
       type: mongoose.Schema.Types.ObjectId,
        ref: 'SalonReview',
    }],
    favouriteCount: {
        type: Number,
        default: 0,
    },
    availableTable: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon-table',
    }],
    ratingsAverage: {
        type: Number,
        default: 1,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be less 5.0'],
        set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
});

salonSchema.pre(/^find/, function (next) {
    this.populate('booking').populate('service');
    next();
});

const Salon = mongoose.model('Salon', salonSchema);

module.exports = Salon;