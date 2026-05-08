import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'word-anchor',
      version: '1.0.0',
      description: 'word-anchor 后端API文档',
    },
    tags: [
      { name: 'Word', description: '单词相关接口' },
      { name: 'User', description: '用户相关接口' },
      { name: 'Auth', description: '认证相关接口' },
      { name: 'Learn', description: '学习相关接口' },
    ],
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '在登录接口获取的 JWT token',
        },
      },
      schemas: {
        StandardResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', description: 'HTTP 状态码' },
            data: { description: '响应数据' },
            message: { type: 'string', description: '响应消息' },
          },
        },
        Word: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            english: { type: 'string' },
            definitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  meaning: { type: 'string' },
                  partOfSpeech: { type: 'string' },
                },
              },
            },
            phonetic: { type: 'string' },
            exampleSentence: { type: 'array', items: { type: 'string' } },
            related: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            createdBy: { type: 'string' },
          },
        },
        NewWord: {
          type: 'object',
          required: ['english', 'definitions', 'phonetic'],
          properties: {
            english: { type: 'string' },
            definitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  meaning: { type: 'string' },
                  partOfSpeech: { type: 'string' },
                },
              },
            },
            phonetic: { type: 'string' },
            exampleSentence: { type: 'array', items: { type: 'string' } },
            related: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            isAdmin: { type: 'boolean' },
          },
        },
        NewUser: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
            email: { type: 'string' },
          },
        },
        LoginBody: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            username: { type: 'string' },
            _id: { type: 'string' },
          },
        },
        UserWord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            wordId: { type: 'string' },
            english: { type: 'string' },
            easeFactor: { type: 'number' },
            lastLearned: { type: 'string' },
            interval: { type: 'number' },
            dueDate: { type: 'string' },
            repetition: { type: 'number' },
            favorited: { type: 'boolean' },
          },
        },
        FamiliarityBody: {
          type: 'object',
          required: ['familiarity'],
          properties: {
            familiarity: {
              type: 'integer',
              minimum: 0,
              maximum: 5,
              description: '熟练度 0-5',
            },
          },
        },
        BriefWordList: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['learn', 'review'] },
            words: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  english: { type: 'string' },
                  status: { type: 'string', enum: ['idle', 'passed', 'failed'] },
                },
              },
            },
            count: { type: 'integer' },
          },
        },
        LearningSession: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            mode: { type: 'string', enum: ['learn', 'review'] },
            words: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  english: { type: 'string' },
                  status: { type: 'string', enum: ['idle', 'passed', 'failed'] },
                },
              },
            },
            queueSnapshot: {
              type: 'object',
              properties: {
                index: { type: 'integer' },
                isRepeating: { type: 'boolean' },
                repeatQueue: { type: 'array', items: { type: 'integer' } },
                version: { type: 'string' },
              },
            },
            version: { type: 'string' },
          },
        },
        PatchLearningSessionBody: {
          type: 'object',
          required: ['queueSnapshot'],
          properties: {
            queueSnapshot: {
              type: 'object',
              properties: {
                index: { type: 'integer' },
                isRepeating: { type: 'boolean' },
                repeatQueue: { type: 'array', items: { type: 'integer' } },
                version: { type: 'string' },
              },
            },
          },
        },
        StatsResponse: {
          type: 'object',
          properties: {
            todayCount: { type: 'integer' },
            totalCount: { type: 'integer' },
          },
        },
        UserWordFavoriteResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            wordId: { type: 'string' },
            userId: { type: 'string' },
            favorited: { type: 'boolean' },
          },
        },
      },
    },
  },
  apis: [
    './src/index.ts',
    './src/modules/words/controllers/word.ts',
    './src/modules/users/controllers/users.ts',
    './src/modules/auth/controllers/login.ts',
    './src/modules/auth/controllers/register.ts',
    './src/modules/learn/controllers/userWords.ts',
    './src/modules/learn/controllers/learningSession.ts',
  ],
};

export const openapiSpecification = swaggerJsdoc(options);
