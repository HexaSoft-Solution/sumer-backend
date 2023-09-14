const mongoose = require('mongoose');

const metaUsersSchema = new mongoose.Schema({
    metaId: {
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

const MetaUsers = mongoose.model('Meta-Users', metaUsersSchema);

module.exports = MetaUsers;