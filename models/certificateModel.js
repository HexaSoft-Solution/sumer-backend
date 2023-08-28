const mongoose = require('mongoose');
const validator = require('validator');

const CertificateSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please enter a Certificate name"],
        trim: true
    },
    issueDate: {
        type: Date,
        required: [true, "Please enter a issue date"],
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
        validate: [validator.isURL, 'Please provide a valid URL'],
        trim: true
    },
    certificatePhoto: String,
    cloudinaryId: String,
});

const Certificate = mongoose.model('Certificate', CertificateSchema);


module.exports = Certificate;