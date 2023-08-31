const mongoose = require('mongoose');
const addressSchema = new mongoose.Schema({
    street: {
        type: String,
        required: true,
    },
    area: {
        type: String,
        required: true,
    },
    houseNo: {
        type: String,
    },
    houseType: {
        type: String,
        required: true,
        enum: ["Apartment", "House", "Office"],
    },
    AdditionalDirection: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        required: [true, "telephone-required"],
        unique: true,
        validate: {
            validator: function (v) {
                const re = /^(\+?\d{1,3}[- ]?)?\d{10}$/;
                return !v || !v.trim().length || re.test(v);
            },
            message: "phone-invalid",
        },
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
