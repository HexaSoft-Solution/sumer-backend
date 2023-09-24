const mongoose = require('mongoose');

const SupportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title can not be more than 100 characters']
    },
    message: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: ""
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

const Support = mongoose.model('Support', SupportSchema);

module.exports = Support;