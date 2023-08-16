const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter service name"],
    },
    description: {
        type: String,
        required: [true, "Please enter service description"],
    },
    servicePhoto: String,
    cloudinaryId: String,
});

const Service = mongoose.model('Service', ServiceSchema);

module.exports = Service;