const mongoose = require('mongoose');

const ConsultantSchema = new mongoose.Schema({
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   },
   consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   },
   messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
       default: null
   }],
    status: {
        type: String,
        enum: ['Active', 'Ended'],
        default: 'Active'
    }
});

ConsultantSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'firstName lastName userPhoto',
    }).populate({
        path: 'consultant',
        select: 'firstName lastName userPhoto',
    }).populate('messages');
    next();
});

const Consultant = mongoose.model('Consultant', ConsultantSchema);

module.exports = Consultant;