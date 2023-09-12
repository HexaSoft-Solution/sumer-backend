const mongoose = require('mongoose');

const googleUsersSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
    },
    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    email: {
        type: String
    }
});

const GoogleUsers = mongoose.model('Google-Users', googleUsersSchema);

module.exports = GoogleUsers;