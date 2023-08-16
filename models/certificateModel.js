const mongoose = require('mongoose');

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
        trim: true
    },
    certificatePhoto: String,
    cloudinaryId: String,
});

const Certificate = mongoose.model('Certificate', CertificateSchema);


module.exports = Certificate;