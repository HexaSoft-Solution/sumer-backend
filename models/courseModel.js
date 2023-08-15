const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: [true, "Please provide a course name"],
    },
    issueDate: {
        type: Date,
        requires: [true, "Please provide a issue date"]
    },
    ServicePhoto: String,
    cloudinaryId: String,
});

const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;