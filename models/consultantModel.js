const mongoose = require('mongoose');

const ConsultantSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title can not be more than 100 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    consultant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultant'
    },
    numOfMessages: {
        type: Number,
        default: 50
    },
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    }],
    status: {
        type: String,
        enum: ['Active', 'Ended'],
        default: 'Active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ConsultantSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'firstName lastName userPhoto',
    }).populate({
        path: 'consultant',
        select: 'firstName lastName userPhoto',
    }).populate('messages');
    next();
});

const Consultant = mongoose.model('Consultant', ConsultantSchema);

module.exports = Consultant;