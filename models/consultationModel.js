const mongoose = require('mongoose');

const ConsultationSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    Specialization: {
        type: String,
        required: [true, "Please enter the Specialization"],
    },
    about: {
        type: String,
        required: [true, "Please enter the About"],
    },
    price: {
      type: Number,
      required: [true, "Please enter the Price"],
    },
    promotedAds: {
        type: Number,
        default: 0
    },
    adsExpireDate: {
        type: Date,
        default: Date.now(),
    },
    service: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
    }],
    certificates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Certificate",
    }],
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
    }],
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending'
    },
    consultants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consultant",
    }],
    balance: {
        type: Number,
        default: 0
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
    Reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation-Review',
        default: []
    }],
}, {
    timestamps: true
});



ConsultationSchema.pre(/^find/, function (next) {
    this.populate('service').populate('certificates').populate('courses').populate({
        path: 'owner',
        select: "firstName firstName name userPhoto"
    })
    .populate({
        path: 'consultants',
        select: 'user messages title',
    });
    next();
});

const Consultation = mongoose.model('Consultation', ConsultationSchema);

module.exports = Consultation;
