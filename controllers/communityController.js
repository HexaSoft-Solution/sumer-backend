const Community = require("../models/communityModel");
const Comment = require("../models/commentModel");

const factory = require("./handlerFactory");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const cloudinary = require("../utils/cloudinary");

exports.getAllPosts = async (req, res, next) => {
  // #swagger.tags = ['Community']
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
  
    return factory.getAllMagdy(req, res, next, Community);
  }; 
exports.getPost = 
async (req, res, next) => {
  // #swagger.tags = ['Community']

  return factory.getOne(req, res, next,Community);
};

exports.addPost = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const userId = req.user.id;

  /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            photo: {
                                type: "string",
                                format: "binary"
                            },
                            post: {
                                type: "string",
                            },
                        },
                        required: ["photo"]
                    }
                }
            }
        }
    */

  const { post } = req.body;


  let result;
  let userPost;

  if (req?.file?.path) {
    result = await cloudinary.uploader.upload(req.file.path, {
      public_id: `/${Math.random() * 10000000000}/Photo`,
      folder: "posts",
      resource_type: "image",
    });

    if (!result) {
      return next(
        new AppError("Something went wrong with the image upload", 400)
      );
    }

    userPost = await Community.create({
      post,
      user: userId,
      postPhoto: result?.secure_url,
      cloudinaryId: result?.public_id,
    });

    res.status(200).json({
      status: "success",
      data: {
        userPost,
      },
    });
  } else {
    userPost = await Community.create({
      post,
      user: userId,
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      userPost,
    },
  });
});

exports.myPosts = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const userId = req.user.id;

  const posts = await Community.find({ user: userId });

  res.status(200).json({
    status: "success",
    posts,
  });
});

exports.addPostPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const postId = req.params.id;

  /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            photo: {
                                type: "string",
                                format: "binary"
                            },
                           
                        },
                        required: ["photo"]
                    }
                }
            }
        }
    */
  const userPost = await Community.findById(postId);

  const result = await cloudinary.uploader.upload(req.file.path, {
    public_id: `/${userPost.user._id}-${Math.random() * 10000000000}/${
      userPost.user._id
    }Photo`,
    folder: "posts",
    resource_type: "image",
  });

  if (!result) {
    return next(
      new AppError("Something went wrong with the image upload", 400)
    );
  }

  const updatedPost = await Community.findByIdAndUpdate(postId, {
    postPhoto: result.secure_url,
    cloudinaryId: result.public_id,
  });

  res.status(200).json({
    status: "success",
    data: {
      updatedPost,
    },
  });
});

exports.deletePostPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const postId = req.params.id;

  const userPost = await Community.findById(postId);

  await cloudinary.uploader.destroy(userPost.cloudinaryId);

  const updatedUserPost = await Community.findByIdAndUpdate(postId, {
    postPhoto: null,
    cloudinaryId: null,
  });

  res.status(200).json({
    status: "success",
    data: {
      updatedUserPost,
    },
  });
});

exports.editPost = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const postId = req.params.id;

  /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            photo: {
                                type: "string",
                                format: "binary"
                            },
                            post: {
                                type: "string",
                            },
                        },
                        required: ["photo"]
                    }
                }
            }
        }
    */


  const { post } = req.body;

  if (req?.file?.path) {
    result = await cloudinary.uploader.upload(req.file.path, {
      public_id: `/${Math.random() * 10000000000}/Photo`,
      folder: "posts",
      resource_type: "image",
    });

    if (!result) {
      return next(
          new AppError("Something went wrong with the image upload", 400)
      );
    }
    const updatedUserPost = await Community.findByIdAndUpdate(postId, {
      post,
      postPhoto: result?.secure_url,
      cloudinaryId: result?.public_id,
    });

    res.status(200).json({
      status: "success",
      data: {
        updatedUserPost,
      },
    });
  }

  const updatedUserPost = await Community.findByIdAndUpdate(postId, {
    post,
  });

  res.status(200).json({
    status: "success",
    data: {
      updatedUserPost,
    },
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const postId = req.params.id;

  const userPost = await Community.findById(postId);

  if (userPost.user._id.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );
  }

  if (userPost.cloudinaryId) {
    await cloudinary.uploader.destroy(userPost.cloudinaryId);
  }

  await Community.findByIdAndDelete(postId);

  res.status(200).json({
    status: "success",
    data: null,
  });
});

exports.likePost = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const userId = req.user.id;
  const postId = req.params.id;

  const userPost = await Community.findById(postId);

  console.log(userPost.likes);

  // Check if the user has already liked the post
const hasLiked = userPost.likes.some((like) => like?._id.toString() === userId.toString());

if (!hasLiked) {
  // If the user hasn't liked the post, add their like
  await Community.findByIdAndUpdate(postId, {
    $push: { likes: userId },
  });
} else {
  // If the user has already liked the post, remove their like
  await Community.findByIdAndUpdate(postId, {
    $pull: { likes: userId },
  });
}

  res.status(200).json({
    status: "success",
    messgage: hasLiked? "Unliked" : "Liked"
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const userId = req.user.id;
  const postId = req.params.id;

  const post = await Community.findById(postId);

  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  const { comment } = req.body;

  const Commment = await Comment.create({
    comment,
    user: userId,
  });

  await Community.findByIdAndUpdate(postId, {
    $push: { Comments: Commment._id },
  });

  res.status(200).json({
    status: "success",
    Commment,
  });
});

exports.postsComments = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const postId = req.params.id;

  const post = await Community.findById(postId);

  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  const comments = await Comment.find({ _id: { $in: post.Comments } }).populate(
    "user"
  );

  res.status(200).json({
    status: "success",
    comments,
  });
});

exports.addCommentPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const commentId = req.params.id;
  const userId = req.user.id;
  /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            photo: {
                                type: "string",
                                format: "binary"
                            },
                           
                        },
                        required: ["photo"]
                    }
                }
            }
        }
    */

  const comment = await Comment.findById(commentId);

  if (comment.user.Id !== userId) {
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    public_id: `/${comment.user._id}-${Math.random() * 10000000000}/${
      comment.user._id
    }Photo`,
    folder: "comments",
    resource_type: "image",
  });

  await Comment.findByIdAndUpdate(commentId, {
    commentPhoto: result.secure_url,
    cloudinaryId: result.public_id,
  });

  res.status(200).json({
    status: "success",
    data: {
      comment,
    },
  });
});

exports.deleteCommentPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const commentId = req.user.id;
  const userId = req.user.id;

  const comment = await Comment.findById(commentId);

  if (comment.user.Id !== userId) {
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );
  }

  await cloudinary.uploader.destroy(comment.cloudinaryId);

  await Comment.findByIdAndUpdate(commentId, {
    commentPhoto: null,
    cloudinaryId: null,
  });

  res.status(200).json({
    status: "success",
    data: {
      comment,
    },
  });
});

exports.editComment = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const commentId = req.params.id;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);

  if (comment.user._id.toString() !== userId.toString()) {
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId, {
    comment: req.body.comment,
  });

  res.status(200).json({
    status: "success",
    data: {
      updatedComment,
    },
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Community']
  const commentId = req.params.id;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);

  if (comment.user._id.toString() !== userId.toString()) {
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );
  }

  if (comment.cloudinaryId) {
    await cloudinary.uploader.destroy(comment.cloudinaryId);
  }

  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({
    status: "success",
    data: null,
  });
});

exports.likeComment = catchAsync(async (req, res, next) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  const comment = await Comment.findById(commentId);

  if (
    comment.likes.find((e) => e._id !== userId) ||
    comment.likes.length === 0
  ) {
    await Comment.findByIdAndUpdate(commentId, {
      $push: { likes: userId },
    });
  } else {
    await Comment.findByIdAndUpdate(commentId, {
      $pull: { likes: userId },
    });
  }

  res.status(200).json({
    status: "success",
  });
});
