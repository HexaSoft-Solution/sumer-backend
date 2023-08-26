const mongoose = require('mongoose');

const Commentschema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please add a user']
    },
    comment: {
        type: String,
        required: [true, 'Please add a post']
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    commentPhoto: String,
    cloudinaryId: String,
    created: {
        type: Date,
        default: Date.now
    }
});

Commentschema.pre(/^find/, function (next) {

    this.populate({
        path: 'user',
        select: 'firstName lastName userPhoto',
    }).populate({
        path: 'likes',
        select: 'firstName lastName userPhoto'
    })

    next();
});

const Comments = mongoose.model('Comments', Commentschema);

module.exports = Comments;