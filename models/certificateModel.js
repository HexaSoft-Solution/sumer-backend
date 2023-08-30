const mongoose = require('mongoose');
const validator = require('validator');

const CertificateSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "title-required"],
        trim: true
    },
    issueDate: {
        type: Date,
        required: [true, "date-required"],
    },
    expireDate: {
        type: Date,
    },
    certificateID: {
        type: String,
        trim: true
    },
    certificateURL: {
        type: String,
        trim: true
    },
    certificatePhoto: String,
    cloudinaryId: String,
});

const Certificate = mongoose.model('Certificate', CertificateSchema);


module.exports = Certificate;