const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A salon must have a name'],
    },
    service: [{
        name: {
            type: String,
            required: [true, 'A salon must have a service name'],
            enum: ['Hair', "Makeup artist", "SPA", "Nails", "Massage", "Waxing", "Facial", "Eyelash", "Eyebrow", "Hair removal", "Hair coloring", "Haircut", "Hair styling", "Hair extension", "Hair straightening", "Hair treatment", "Hair perm", "Hair braiding", "Hair relaxing", "Hair bleaching", "Hair curling", "Hair rebonding", "Hair transplant", "Hair loss treatment", "Hair restoration", "Hair weaving", "Hair thickening", "Hair bonding", "Hair spa", "Hair glossing", "Hair gloss", "Hair lamination", "Hair botox", "Hair gloss treatment", "Hair glossing treatment", "Hair lamination treatment", "Hair botox treatment", "Hair glossing", "Hair lamination", "Hair botox", "Hair gloss treatment", "Hair glossing treatment", "Hair lamination treatment", "Hair botox treatment", "Hair glossing", "Hair lamination", "Hair botox", "Hair gloss treatment", "Hair glossing treatment", "Hair laminatio treatment", "Hair botox treatment"],
        },
        ServicePhoto: String,
        cloudinaryId: String,
    }],
    desc: {
        type: String,
        required: [true, 'A salon must have a description'],
    },
    address:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
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
    salonReviews: [{
       type: mongoose.Schema.Types.ObjectId,
        ref: 'SalonReview',
    }],
    favouriteCount: {
        type: Number,
        default: 0,
    },
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

const Salon = mongoose.model('Salon', salonSchema);

module.exports = Salon;