const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please add a user']
    },
    post: {
        type: String,
        required: [true, 'Please add a post']
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    Comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    postPhoto: String,
    cloudinaryId: String,
    created: {
        type: Date,
        default: Date.now
    }
});

const Community = mongoose.model('Community', CommunitySchema);

module.exports = Community;