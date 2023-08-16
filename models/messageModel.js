const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    date: {
        type: Date,
        default: Date.now()
    }
});

MessageSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'sender',
        select: 'firstName lastName userPhoto',
    }).populate({
        path: 'receiver',
        select: 'firstName lastName userPhoto',
    });
    next();
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;