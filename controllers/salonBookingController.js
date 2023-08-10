const SalonBooking = require('../models/salonBookingModel');

const factory = require('./handlerFactory');

exports.getAllSalonBookings = factory.getAll(SalonBooking);