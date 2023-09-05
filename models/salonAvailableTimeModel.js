const mongoose = require('mongoose');

const salonAvailableTableSchema = new mongoose.Schema({
    startTime: {
        type: String,
        enum: ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
        required: true
    },
    endTime: {
        type: String,
        enum: ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'],
        required: true,
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    date: {
        type: Date,
        set: parseDate,
        required: true
    },
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
})

function parseDate(date) {
    if (typeof date === 'string') {
        const parts = date.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }
    return date;
}

const SalonAvailableTable = mongoose.model('Salon-table', salonAvailableTableSchema);

module.exports = SalonAvailableTable;