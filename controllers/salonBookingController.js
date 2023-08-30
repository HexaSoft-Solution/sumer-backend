const SalonBooking = require('../models/salonBookingModel');

const factory = require('./handlerFactory');

exports.getAllSalonBookings = () => {
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
  
    return factory.getAll(SalonBooking);
  };