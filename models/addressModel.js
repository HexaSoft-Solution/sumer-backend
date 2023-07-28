const mongoose = require('mongoose');
const addressSchema = new mongoose.Schema({
    street: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    houseNo: {
        type: String,
        required: true,
    },
    houseType: {
        type: String,
        required: true,
        enum: ["Apartment", "House", "Office"],
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
});

module.exports = mongoose.model('Address', addressSchema);
