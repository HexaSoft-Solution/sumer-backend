const mongoose = require ('mongoose');

const BusinessProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        default: []
    }],
    balance: {
        type: Number,
        default: 0
    },
    Transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'transaction',
        default: [],
    }],
})


const BusinessProfile = mongoose.model('businessProfile', BusinessProfileSchema);

module.exports = BusinessProfile;