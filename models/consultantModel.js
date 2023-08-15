const mongoose = require('mongoose');

const ConsultantSchema = new mongoose.Schema({
   sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   },
   consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   },
   messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
   }],
    status: {
        type: String,
        enum: ['Active', 'Ended'],
        default: 'Active'
    }
});

ConsultantSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'sender',
        select: 'firstName lastName userPhoto',
    }).populate({
        path: 'consultant',
        select: 'firstName lastName userPhoto',
    }).populate('messages');
    next();
});

const Consultant = mongoose.model('Consultant', ConsultantSchema);

module.exports = Consultant;