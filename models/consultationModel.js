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
}, {
    timestamps: true
});



ConsultationSchema.pre(/^find/, function (next) {
    this.populate('service').populate('certificates').populate('courses').populate({
        path: 'owner',
    })
    .populate({
        path: 'consultants',
        select: 'user messages',
    });
    next();
});

const Consultation = mongoose.model('Consultation', ConsultationSchema);

module.exports = Consultation;
