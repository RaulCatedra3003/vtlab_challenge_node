import Deliveries from '@/models/Deliveries.model';
import Products from '@/models/Products.model';

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 };

  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    };
  }

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: 'We couldn\'t find any delivery'
      }
    };
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults,
    deliveries
  };
};

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    };
  }
};

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({_id: req.body.id});
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: 'We couldn\'t find a delivery with the sent ID'
      }
    };
  }
  return delivery;
};

const getByDateAndWeight = async (req) => {
  const limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  const skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;

  const res = await Deliveries.aggregate([
    {
      $facet: {
        deliveries: [
          {
            '$lookup': {
              'from': Products.collection.name,
              'foreignField': '_id',
              'localField': 'products',
              'as': 'products'
            }
          },
          { $match: { 'products.weight': { $gte: parseInt(req.body.weight) } } },
          { $match: { when: { '$gte': new Date(req.body.dateFrom), '$lte': new Date(req.body.dateTo) } } },
          { $skip: skip },
          { $limit: limit }
        ],
        totalResults: [
          {
            '$lookup': {
              'from': Products.collection.name,
              'foreignField': '_id',
              'localField': 'products',
              'as': 'products'
            }
          },
          { $match: { 'products.weight': { $gte: parseInt(req.body.weight) } } },
          { $match: { when: { '$gte': new Date(req.body.dateFrom), '$lte': new Date(req.body.dateTo) } } },
          { $count: 'total' }
        ]
      }
    }
  ]);

  if (!res) {
    throw {
      code: 404,
      data: {
        message: 'We couldn\'t find a delivery with the sent ID'
      }
    };
  }

  return {
    totalResults: res[0].totalResults[0].total,
    deliveries: res[0].deliveries
  };
};

export default {
  find,
  create,
  findOne,
  getByDateAndWeight,
};
