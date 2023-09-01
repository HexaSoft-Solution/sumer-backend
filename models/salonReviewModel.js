const mongoose = require('mongoose');
const Salon = require('./salonModel');

const reviewSalonSchema = new mongoose.Schema(
    {
        fullName: String,
        userPhoto: String,
        review: {
            type: String,
            required: [true, 'Review can not be empty!'],
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        createdAt: {
            type: Date,
            default: Date.now(),
        },
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: [true, 'Review must belongs to a Salon!'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belongs to a user'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

reviewSalonSchema.index({ salon: 1, user: 1 }, { unique: true });

reviewSalonSchema.pre(/^find/, function (next) {

    this.populate({
        path: 'user',
        select: 'firstName lastName userPhoto',
    });

    next();
});

reviewSalonSchema.statics.calcAverageRatings = async function (salonId) {
    const stats = await this.aggregate([
        {
            $match: { salon: salonId },
        },
        {
            $group: {
                _id: '$salon',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            },
        },
    ]);
    if (stats.length > 0) {
        await Salon.findByIdAndUpdate(salonId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating,
        });
    } else {
        await Salon.findByIdAndUpdate(salonId, {
            ratingsQuantity: 0,
            ratingsAverage: 0,
        });
    }
};

reviewSalonSchema.post('save', function () {
    this.constructor.calcAverageRatings(this.salon);
});

const SalonReview = mongoose.model('Salon-Review', reviewSalonSchema);

module.exports = SalonReview;