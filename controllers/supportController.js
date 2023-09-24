const Support = require('../models/supportModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');

const factory = require("./handlerFactory");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const cloudinary = require("../utils/cloudinary");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllSupportsTickets = async (req, res, next) => {
    // #swagger.tags = ['Supports Tickets']
    /*  #swagger.description = 'TO CUSTOMIZE YOUR REQUEST: ?price[gte]=1000&price[lte]=5000 OR ?category[in]=electronics,clothing OR ?page=3&sort=-createdAt&limit=20&fields=name,description ' */
    /*  #swagger.parameters['limit'] = {
                in: 'query',
                description: 'Page size: ex: ?limit=10',
                type: 'number'
        } */
    /*  #swagger.parameters['fields'] = {
                in: 'query',
                description: 'example: ?fields=name,description' ,
        } */
    /*  #swagger.parameters['page'] = {
                in: 'query',
                description: 'indexing page: ex: ?page=2',
                type: 'number'
        } */
    /*  #swagger.parameters['sort'] = {
                in: 'query',
                description: 'example: ?sort=name,-createdAt',
        } */
    return factory.getAllMagdy(req, res, next, Support);
};

exports.getSupportTicket = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Supports Tickets']
    const ticketId = req.params.ticketId;

    const ticket = await Support.findById(ticketId)
        .populate('message')
        .populate({
            path: 'user',
            select: 'firstName lastName userPhoto',
        });

    if (!ticket) {
        return next(new AppError('No ticket found with that ID', 404));
    }

    if (!req.user.supprots.find(e => e.toString() === ticketId) && req.user.role !== 'admin') {
        return next(new AppError('You are not allowed to view this ticket', 401));
    }

    res.status(200).json({
        status: 'success',
        ticket
    });
});

exports.createSupportTicket = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Supports Tickets']
    const {
        title
    } = req.body;

    const newTicket = await Support.create({
        user: req.user._id,
        title
    });

    req.user.supprots.push(newTicket._id);

    await req.user.save();

    res.status(201).json({
        status: 'success',
        newTicket
    });
});

exports.userSendTicketMessage = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Supports Tickets']
    const ticketId = req.params.ticketId;

    const {
        message
    } = req.body;

    const newMessage = await Message.create({
        message,
        sender: req.user._id,
        receiver: "6510541494b35256e90f791c"
    });

    const ticket = await Support.findOneAndUpdate(
    {
        _id: ticketId
    }, {
        $push: {
            message: newMessage._id
        }
    }, {
        new: true,
        runValidators: true
    });

    if (!ticket) {
        return next(new AppError('No ticket found with that ID', 404));
    }

    res.status(201).json({
        status: 'success',
        ticket
    });
});

exports.adminSendTicketMessage = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Supports Tickets']
    const ticketId = req.params.ticketId;

    const {
        message
    } = req.body;

    const ticket = await Support.findById(ticketId);

    if (!ticket) {
        return next(new AppError('No ticket found with that ID', 404));
    }

    const newMessage = await Message.create({
        message,
        sender: "6510541494b35256e90f791c",
        receiver: ticket.user
    });

    ticket.message.push(newMessage._id);
    await ticket.save();

    res.status(201).json({
        status: 'success',
        ticket
    });
});

exports.endSupportTicket = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Supports Tickets']
    const ticketId = req.params.ticketId;

    const ticket = await Support.findById(ticketId);

    if (!ticket) {
        return next(new AppError('No ticket found with that ID', 404));
    }

    ticket.status = "Ended";
    await ticket.save();

    res.status(201).json({
        status: 'success',
        ticket
    });
});