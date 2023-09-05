const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true,
        trim: true
    },
    cloudinary_id: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})



const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;