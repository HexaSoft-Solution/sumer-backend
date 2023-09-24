const express = require('express');

const supportController = require('../controllers/supportController');
const authController = require('../controllers/authController');

const router = express.Router();

router
    .route('/')
    .get(
        authController.protect,
        authController.restrictTo('admin'),
        supportController.getAllSupportsTickets
    )
    .post(
        authController.protect,
        supportController.createSupportTicket
    )


router
    .route('/:ticketId')
    .get(
        authController.protect,
        supportController.getSupportTicket
    )
    .patch(
        authController.protect,
        authController.restrictTo('admin'),
        supportController.endSupportTicket
    )

router
    .route('/user-send-message/:ticketId')
    .post(
        authController.protect,
        supportController.userSendTicketMessage
    )

router
    .route('/admin-send-message/:ticketId')
    .post(
        authController.protect,
        supportController.adminSendTicketMessage
    )

module.exports = router;