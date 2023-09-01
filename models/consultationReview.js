const mongoose = require('mongoose')
const Consultation = require('./consultationModel')
const Salon = require("./salonModel");


const consultationReviewSchema = new mongoose.Schema({
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
    consultation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation',
        required: [true, 'Review must belongs to a Consultation!'],
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

consultationReviewSchema.index({ consultation: 1, user: 1 }, { unique: true });

consultationReviewSchema.pre(/^find/, function (next) {

    this.populate({
        path: 'user',
        select: 'firstName lastName userPhoto',
    });

    next();
});

consultationReviewSchema.statics.calcAverageRatings = async function (consultationId) {
    const stats = await this.aggregate([
        {
            $match: { salon: consultationId },
        },
        {
            $group: {
                _id: 'Consultation',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            },
        },
    ]);
    if (stats.length > 0) {
        await Salon.findByIdAndUpdate(consultationId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating,
        });
    } else {
        await Salon.findByIdAndUpdate(consultationId, {
            ratingsQuantity: 0,
            ratingsAverage: 0,
        });
    }
};

const ConsultationReview = mongoose.model('Consultation-Review', consultationReviewSchema);

module.exports = ConsultationReview;