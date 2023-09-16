const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'A promotion must have a title'],
    },
    desc: {
        type: String,
        required: [true, 'A promotion must have a description'],
    },
    day: {
        type: Number,
        required: [true, 'A promotion must have a day'],
    },
    promotionPoint: {
        type: Number,
        required: [true, 'A promotion must have a promotionPoint'],
    },
    price: {
        type: Number,
        required: [true, 'A promotion must have a price'],
    },
});

const Promotion = mongoose.model('Promotion', promotionSchema);


module.exports = Promotion;