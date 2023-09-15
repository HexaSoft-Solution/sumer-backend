const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
    cardNumber: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    expiryMonth: {
        type: String,
        required: true,
    },
    expiryYear: {
        type: String,
        required: true,
    },
    cardType: {
        type: String,
        default: function () {
            const firstFourDigits = this.cardNumber.substr(0, 4);
            if (firstFourDigits === '5078') {
                return 'Meza';
            } else if (firstFourDigits.startsWith('4')) {
                return 'Visa';
            } else if (firstFourDigits.startsWith('5')) {
                return 'MasterCard';
            } else {
                return 'Other';
            }
        },
    },
});

const CreditCard = mongoose.model('CreditCard', creditCardSchema);

module.exports = CreditCard;
