import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'RASADHANA',
      version: '1.0.0',
      description: 'RASADHANA API DOCUMENTATION',
    },
    servers: [
      {
        url: `https://be-rasadhana-245949327575.asia-southeast2.run.app`,
        description: 'Production url',
      },
      {
        url: `http://localhost:${process.env.PORT || 33000}`,
        description: 'Local development server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              required: true,
              description: "User's full name",
            },
            email: {
              type: 'string',
              required: true,
              format: 'email',
              description: "User's email address",
            },
            password: {
              type: 'string',
              description: "User's password",
            },
            photoUrl: {
              type: 'string',
              description: "URL to the user's profile photo",
            },
            resetToken: {
              type: 'string',
              description: 'Token used for resetting the password',
            },
            registrationOtp: {
              type: 'string',
              description: 'OTP used during registration verification',
            },
            otpExpiration: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration time of the OTP',
            },
          },
        },
        IngredientsPhoto: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description:
                'The unique identifier of the user to which the photo belongs.',
              format: 'uuid', // Assuming ObjectId is used as a UUID, change if using a different format.
            },
            photoUrl: {
              type: 'string',
              description: "URL of the user's photo.",
              format: 'uri',
            },
            uploadedAt: {
              type: 'string',
              description: 'The date and time when the photo was uploaded.',
              format: 'date-time',
            },
          },
          required: ['userId', 'photoUrl'], // Note that 'uploadedAt' is not required as it has a default value.
          example: {
            userId: '507f1f77bcf86cd799439011',
            photoUrl: 'https://example.com/path/to/photo.jpg',
            uploadedAt: '2023-01-01T00:00:00.000Z',
          },
        },
        Recipe: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              required: true,
              description: 'The title of the recipe.',
            },
            ingredients: {
              type: 'string',
              required: true,
              description:
                'List of ingredients used in the recipe, formatted as a string.',
            },
            steps: {
              type: 'string',
              required: true,
              description:
                'Detailed preparation steps of the recipe, formatted as a string.',
            },
            recipeImage: {
              type: 'string',
              required: true,
              description: 'URL to the image of the finished recipe.',
              format: 'uri',
            },
          },
          required: ['title', 'ingredients', 'steps', 'recipeImage'],
          example: {
            title: 'Chocolate Chip Cookies',
            ingredients: '1 cup sugar, 2 cups flour, 1 cup chocolate chips',
            steps:
              'Mix all ingredients and bake at 350 degrees for 10 minutes.',
            recipeImage:
              'https://example.com/images/chocolate_chip_cookies.jpg',
          },
        },
      },
    },
    tags: [
      // Define your tags here
      {
        name: 'Authentication',
        description: 'Endpoints for user authentication processes',
      },
    ],
  },
  apis: [
    './routes/photo.js', // Correct path from the root to the photo.js file
    './routes/recipe.js', // Correct path from the root to the recipe.js file
    './routes/user.js', // Correct path from the root to the user.js file
    './index.js', // Correct path from the root to the index.js file
  ],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
