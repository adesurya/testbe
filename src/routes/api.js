// src/routes/api.js
const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const whatsappController = require('../controllers/whatsappController');
const messageController = require('../controllers/messageController');
const userController = require('../controllers/userController');
const planController = require('../controllers/planController');
const paymentController = require('../controllers/paymentController');
const adminController = require('../controllers/adminController');
const userStatsController = require('../controllers/userStatsController'); // Add this line
const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController')
const multer = require('multer');
const path = require('path');
const {handleMulterError } = require('../config/multer');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Ensure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});
router.post('/messages/send', auth, upload.single('image'), handleMulterError, messageController.sendMessage);



/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           example: "admin"
 *         password:
 *           type: string
 *           example: "admin123"
 *     WhatsappBindRequest:
 *       type: object
 *       required:
 *         - userId
 *         - phoneNumber
 *       properties:
 *         userId:
 *           type: string
 *           example: "user123"
 *         phoneNumber:
 *           type: string
 *           example: "628123456789"
 *     MessageRequest:
 *       type: object
 *       required:
 *         - userId
 *         - targetNumber
 *         - message
 *       properties:
 *         userId:
 *           type: string
 *           example: "user123"
 *         targetNumber:
 *           type: string
 *           example: "628123456789"
 *         message:
 *           type: string
 *           example: "Hello, this is a test message"
 *         imagePath:
 *           type: string
 *           example: "/path/to/image.jpg"
 *         delay:
 *           type: integer
 *           example: 5
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login to get access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', userController.login);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in/up with Google
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google OAuth ID token
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 */

router.post('/auth/google', authController.googleSignIn);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or duplicate username/email
 *       500:
 *         description: Server error
 */

router.post('/auth/register', userController.register);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create new user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/users', auth, isAdmin, userController.createUser);

/**
 * @swagger
 * /api/whatsapp/bind:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Bind new WhatsApp session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WhatsappBindRequest'
 *     responses:
 *       200:
 *         description: QR Code generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/whatsapp/bind', auth, whatsappController.bindWhatsapp);

/**
 * @swagger
 * /api/whatsapp/sessions/{userId}:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get active WhatsApp sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of active sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/whatsapp/sessions/:userId', auth, whatsappController.getActiveSessions);

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     tags: [Messages]
 *     summary: Send WhatsApp message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageRequest'
 *     responses:
 *       200:
 *         description: Message queued successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: No active WhatsApp session
 */
router.post('/messages/send', auth, messageController.sendMessage);

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Get user metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/metrics', auth, userController.getMetrics);

/**
 * @swagger
 * /api/messages/status/{messageId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get message status by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the message
 *     responses:
 *       200:
 *         description: Message status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageId:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   enum: [pending, sent, failed]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/messages/status/:messageId', auth, messageController.getMessageStatus);

/**
 * @swagger
 * /api/messages/history/{userId}:
 *   get:
 *     tags:
 *       - Messages
 *     summary: Get user's message history (both single and bulk messages)
 *     description: Retrieves combined history of single messages and bulk messages for a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved message history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       message_type:
 *                         type: string
 *                         enum: [single, bulk]
 *                       target_number:
 *                         type: string
 *                       message:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, sent, failed]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     current_page:
 *                       type: integer
 *                     per_page:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - User trying to access another user's messages
 *       500:
 *         description: Internal server error
 */
router.get('/messages/history/:userId', auth, messageController.getMessageHistory);  // Perhatikan 'messages' bukan 'message'


/**
 * @swagger
 * /api/messages/history/{userId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get user message history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: Message history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   message:
 *                     type: string
 *                   target_number:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending, sent, failed]
 *                   sender_number:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 */

router.get('/messages/history/:userId', auth, messageController.getUserMessages);


/**
 * @swagger
 * components:
 *   schemas:
 *     Plan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         messageLimit:
 *           type: integer
 *         price:
 *           type: number
 *         durationDays:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [active, inactive]
 * 
 *     UserPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         planId:
 *           type: integer
 *         messagesRemaining:
 *           type: integer
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [active, expired, cancelled]
 */

/**
 * @swagger
 * /api/plans:
 *   get:
 *     tags: [Plans]
 *     summary: Get all available plans
 *     description: Retrieve all active plans with their details and statistics
 *     responses:
 *       200:
 *         description: List of all plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       messageLimit:
 *                         type: integer
 *                       price:
 *                         type: number
 *                       durationDays:
 *                         type: integer
 *                       description:
 *                         type: string
 *                       features:
 *                         type: array
 *                         items:
 *                           type: string
 *                       activeUsers:
 *                         type: integer
 *                       currentActiveUsers:
 *                         type: integer
 */
router.get('/plans', planController.getAllPlans);

/**
 * @swagger
 * /api/plans:
 *   post:
 *     tags: [Plans]
 *     summary: Create new plan (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - messageLimit
 *               - price
 *               - durationDays
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Basic Plan"
 *               messageLimit:
 *                 type: integer
 *                 example: 1000
 *               price:
 *                 type: number
 *                 example: 99.99
 *               durationDays:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       201:
 *         description: Plan created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/plans', auth, isAdmin, planController.createPlan);

/**
 * @swagger
 * /api/plans/{planId}:
 *   put:
 *     tags: [Plans]
 *     summary: Update plan (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Plan'
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/plans/:planId', auth, isAdmin, planController.updatePlan);

/**
 * @swagger
 * /api/plans/{planId}:
 *   delete:
 *     tags: [Plans]
 *     summary: Delete plan (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Plan deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.delete('/plans/:planId', auth, isAdmin, planController.deletePlan);

/**
 * @swagger
 * /api/plans/assign:
 *   post:
 *     tags: [Plans]
 *     summary: Assign plan to user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planId
 *               - amount
 *             properties:
 *               userId:
 *                 type: integer
 *               planId:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Plan assigned successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/plans/assign', auth, planController.assignPlanToUser);

/**
 * @swagger
 * /api/plans/topup:
 *   post:
 *     tags: [Plans]
 *     summary: Top up user plan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planId
 *               - messages
 *               - amount
 *             properties:
 *               userId:
 *                 type: integer
 *               planId:
 *                 type: integer
 *               messages:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Plan topped up successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/plans/topup', auth, planController.topupUserPlan);

/**
 * @swagger
 * /api/plans/user/{userId}:
 *   get:
 *     tags: [Plans]
 *     summary: Get user plans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserPlan'
 */
router.get('/plans/user/:userId', auth, planController.getUserPlans);

/**
 * @swagger
 * /api/plans/admin/topup:
 *   post:
 *     tags: [Plans]
 *     summary: Admin top up user plan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planId
 *               - messages
 *             properties:
 *               userId:
 *                 type: integer
 *               planId:
 *                 type: integer
 *               messages:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Plan topped up by admin successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/plans/admin/topup', auth, isAdmin, planController.adminTopupUserPlan);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/users', auth, isAdmin, userController.getAllUsers);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/users/:userId', auth, userController.getUserById);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user profile
 *     description: Get detailed profile information for authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Numeric ID of the user
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                       example: "user"
 *                     status:
 *                       type: string
 *                       enum: [active, inactive]
 *                       example: "active"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     profile_picture:
 *                       type: string
 *                       nullable: true
 *                     oauth_provider:
 *                       type: string
 *                       enum: [local, google]
 *                       example: "local"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       403:
 *         description: Forbidden - User trying to access another user's profile
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/users/:userId', auth, userController.getUserProfile); 

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     tags: [Users]
 *     summary: Update user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 */
router.put('/users/:userId', auth, userController.updateUser);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/users/:userId', auth, isAdmin, userController.deleteUser);

/**
 * @swagger
 * /api/plans/transactions:
 *   get:
 *     tags: [Plans]
 *     summary: Get all transactions (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   user_id:
 *                     type: integer
 *                   plan_id:
 *                     type: integer
 *                   transaction_type:
 *                     type: string
 *                     enum: [purchase, topup]
 *                   amount:
 *                     type: number
 *                   payment_method:
 *                     type: string
 *                   messages_added:
 *                     type: integer
 *                   payment_status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   plan_name:
 *                     type: string
 *                   username:
 *                     type: string
 */
router.get('/plans/transactions', auth, isAdmin, planController.getAllTransactions);

/**
 * @swagger
 * /api/plans/transactions/{userId}:
 *   get:
 *     tags: [Plans]
 *     summary: Get user transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   transaction_type:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   messages_added:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                   plan_name:
 *                     type: string
 */
router.get('/plans/transactions/:userId', auth, planController.getPlanTransactions);


/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Admin
 *     description: Admin only endpoints
 *   - name: WhatsApp
 *     description: WhatsApp session management
 *   - name: Plans
 *     description: Plan management
 *   - name: Messages
 *     description: Message sending and history
 *   - name: Metrics
 *     description: System metrics and statistics
 * 
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/admin/whatsapp/sessions:
 *   get:
 *     tags: [Admin]
 *     summary: Get all WhatsApp sessions with stats [Admin only]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all WhatsApp sessions with usage statistics
 *       403:
 *         description: Access denied. Admin only.
 */
router.get('/admin/whatsapp/sessions', auth, isAdmin, whatsappController.getAllSessions);

/**
 * @swagger
 * /api/whatsapp/sessions/{userId}:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get user's WhatsApp sessions [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user's WhatsApp sessions with stats
 */
router.get('/whatsapp/sessions/:userId', auth, whatsappController.getUserSessions);

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Get system-wide metrics and statistics [Admin only]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive system metrics
 *       403:
 *         description: Access denied. Admin only.
 */
router.get('/metrics', auth, isAdmin, whatsappController.getMetrics);


/**
 * @swagger
 * /api/messages/bulk/send:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Send bulk messages with optional image
 *     description: Send messages to multiple recipients with optional image attachment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - targetNumbers
 *               - message
 *             properties:
 *               targetNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of target phone numbers
 *                 example: ["628123456789", "628234567890"]
 *               message:
 *                 type: string
 *                 description: Message content, supports formatting and emojis
 *                 example: "**Hello!** :smile:\n__This is a test message__"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file (PNG, JPG, JPEG, max 5MB)
 *               baseDelay:
 *                 type: integer
 *                 description: Base delay between messages in seconds
 *                 default: 30
 *               intervalDelay:
 *                 type: integer
 *                 description: Random additional delay in seconds
 *                 default: 10
 *     responses:
 *       200:
 *         description: Messages queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Bulk messages queued for sending"
 *                 data:
 *                   type: object
 *                   properties:
 *                     bulkId:
 *                       type: integer
 *                       example: 123
 *                     totalMessages:
 *                       type: integer
 *                       example: 2
 *                     activeSessionsCount:
 *                       type: integer
 *                       example: 1
 *                     estimatedTimeMinutes:
 *                       type: integer
 *                       example: 2
 *                     planDetails:
 *                       type: object
 *                       properties:
 *                         planId:
 *                           type: integer
 *                           example: 1
 *                         messagesRemaining:
 *                           type: integer
 *                           example: 98
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "targetNumbers must be a non-empty array"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported file type
 *       500:
 *         description: Server error
 * 
 * /api/messages/bulk/{bulkId}/status:
 *   get:
 *     tags: [Messages]
 *     summary: Get bulk message sending status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bulkId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bulk message status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 status:
 *                   type: string
 *                   enum: [processing, completed, failed, partially_completed]
 *                   example: "processing"
 *                 totalMessages:
 *                   type: integer
 *                   example: 100
 *                 sentMessages:
 *                   type: integer
 *                   example: 45
 *                 failedMessages:
 *                   type: integer
 *                   example: 5
 *                 pendingMessages:
 *                   type: integer
 *                   example: 50
 *                 failedNumbers:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["628123456789"]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Bulk message not found
 *       500:
 *         description: Server error
 * 
 * /api/messages/bulk/history:
 *   get:
 *     tags: [Messages]
 *     summary: Get bulk message history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of bulk messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       totalMessages:
 *                         type: integer
 *                       successCount:
 *                         type: integer
 *                       failedCount:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object       
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     current:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MessageFormat:
 *       type: object
 *       properties:
 *         formatType:
 *           type: string
 *           enum: [bold, italic, strikethrough, monospace, emoji]
 *         syntax:
 *           type: string
 *         example:
 *           type: string
 *         result:
 *           type: string
 *     MessageRequest:
 *       type: object
 *       required:
 *         - targetNumber
 *         - message
 *       properties:
 *         targetNumber:
 *           type: string
 *           description: "Nomor tujuan (format: kode negara + nomor)"
 *           example: "628123456789"
 *         message:
 *           type: string
 *           description: "Pesan dengan format khusus (bold, italic, emoji, dll)"
 *           example: "**PENGUMUMAN** :warning:\n__Kepada Pelanggan__\n\nInfo penting"
 *         imagePath:
 *           type: string
 *           description: "Path ke file gambar (opsional)"
 *           example: "/path/to/image.jpg"
 *         delay:
 *           type: integer
 *           description: "Delay pengiriman dalam detik (opsional)"
 *           example: 0
 * 
 *     BulkMessageRequest:
 *       type: object
 *       required:
 *         - targetNumbers
 *         - message
 *       properties:
 *         targetNumbers:
 *           type: array
 *           items:
 *             type: string
 *           description: "Array nomor tujuan"
 *           example: ["628123456789", "628987654321"]
 *         message:
 *           type: string
 *           description: "Pesan dengan format untuk bulk sending"
 *           example: "**Broadcast** :megaphone:\n__Hello!__"
 *         baseDelay:
 *           type: integer
 *           description: "Delay dasar antara pengiriman (detik)"
 *           example: 30
 *         intervalDelay:
 *           type: integer
 *           description: "Variasi random delay (detik)"
 *           example: 10
 */

/**
 * @swagger
 * /api/messages/formats:
 *   get:
 *     tags: [Messages]
 *     summary: Get available message formats
 *     description: >
 *       Mendapatkan daftar format yang tersedia untuk pesan WhatsApp.
 *       
 *       Format yang didukung:
 *       
 *       1. Bold Text
 *          - Syntax: **text**
 *          - Contoh: **Important**
 *       
 *       2. Italic Text
 *          - Syntax: __text__
 *          - Contoh: __Note__
 *       
 *       3. Strikethrough
 *          - Syntax: ~~text~~
 *          - Contoh: ~~Old price~~
 *       
 *       4. Monospace
 *          - Syntax: ```text```
 *          - Contoh: ```Code```
 *       
 *       5. Emojis
 *          - Syntax: :emoji_name:
 *          - Contoh: :smile: :heart: :check:
 *     responses:
 *       200:
 *         description: Daftar format yang tersedia
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MessageFormat'
 */

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     tags: [Messages]
 *     summary: Send formatted WhatsApp message
 *     description: >
 *       Mengirim pesan WhatsApp dengan dukungan format teks dan emoji.
 *       Mendukung format bold, italic, strikethrough, monospace, dan emoji.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageRequest'
 *     responses:
 *       200:
 *         description: Message sent successfully
 */

/**
 * @swagger
 * /api/messages/bulk/send:
 *   post:
 *     tags: [Messages]
 *     summary: Send bulk formatted messages
 *     description: >
 *       Mengirim pesan WhatsApp dengan format ke banyak nomor sekaligus.
 *       Mendukung semua format yang sama dengan pengiriman single message.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkMessageRequest'
 *     responses:
 *       200:
 *         description: Bulk messages queued successfully
 */
router.get('/messages/formats', messageController.getFormats);

/**
 * @swagger
 * components:
 *   schemas:
 *     UserStats:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             sessions:
 *               type: object
 *               properties:
 *                 active:
 *                   type: integer
 *                   description: Number of active WhatsApp sessions
 *                   example: 2
 *             messages:
 *               type: object
 *               properties:
 *                 single:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                       description: Total single messages sent
 *                     successful:
 *                       type: integer
 *                       example: 95
 *                       description: Successfully sent single messages
 *                     failed:
 *                       type: integer
 *                       example: 5
 *                       description: Failed single messages
 *                     success_rate:
 *                       type: string
 *                       example: "95.00%"
 *                       description: Success rate for single messages
 *                 bulk:
 *                   type: object
 *                   properties:
 *                     campaigns:
 *                       type: integer
 *                       example: 10
 *                       description: Total bulk campaigns created
 *                     total_messages:
 *                       type: integer
 *                       example: 1000
 *                       description: Total messages in bulk campaigns
 *                     successful:
 *                       type: integer
 *                       example: 980
 *                       description: Successfully sent bulk messages
 *                     failed:
 *                       type: integer
 *                       example: 20
 *                       description: Failed bulk messages
 *                     success_rate:
 *                       type: string
 *                       example: "98.00%"
 *                       description: Success rate for bulk messages
 *                     last_campaign_date:
 *                       type: string
 *                       format: date-time
 *                       description: Date of the last bulk campaign
 *                 overall:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 1100
 *                       description: Total messages (single + bulk)
 *                     successful:
 *                       type: integer
 *                       example: 1075
 *                       description: Total successful messages
 *                     failed:
 *                       type: integer
 *                       example: 25
 *                       description: Total failed messages
 *                     success_rate:
 *                       type: string
 *                       example: "97.73%"
 *                       description: Overall success rate
 *             current_plan:
 *               type: object
 *               nullable: true
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Premium Plan"
 *                   description: Current active plan name
 *                 messages_remaining:
 *                   type: integer
 *                   example: 5000
 *                   description: Remaining messages in current plan
 *                 end_date:
 *                   type: string
 *                   format: date-time
 *                   description: Plan expiry date
 *             recent_activity:
 *               type: object
 *               properties:
 *                 single_messages:
 *                   type: array
 *                   description: Last 5 single messages
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       target_number:
 *                         type: string
 *                         example: "628123456789"
 *                       sender_number:
 *                         type: string
 *                         example: "628987654321"
 *                       status:
 *                         type: string
 *                         enum: [pending, sent, failed]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 bulk_campaigns:
 *                   type: array
 *                   description: Last 5 bulk campaigns
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       message_type:
 *                         type: string
 *                         enum: [Regular Message, Button Message]
 *                       total_messages:
 *                         type: integer
 *                         example: 100
 *                       sent_messages:
 *                         type: integer
 *                         example: 98
 *                       status:
 *                         type: string
 *                         enum: [processing, completed, partially_completed, failed]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       preview_message:
 *                         type: string
 *                         example: "🎉 PROMO SPESIAL! Dapatkan diskon 50%..."
 *     ProfileUpdate:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           description: New username
 *         email:
 *           type: string
 *           format: email
 *           description: New email address
 *     PasswordUpdate:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *         newPassword:
 *           type: string
 *           description: New password
 */

/**
 * @swagger
 * /api/user/stats:
 *   get:
 *     tags: [User Stats]
 *     summary: Get user statistics including bulk messages
 *     description: Get comprehensive statistics about user's messaging activities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStats'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 * 
 * /api/user/profile:
 *   put:
 *     tags: [User Stats]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileUpdate'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /api/user/password:
 *   put:
 *     tags: [User Stats]
 *     summary: Update user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordUpdate'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Invalid password or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Route definitions
router.get('/user/stats', auth, userStatsController.getUserStats);
router.put('/user/profile', auth, userStatsController.updateProfile);
router.put('/user/password', auth, userStatsController.updatePassword);

/**
 * @swagger
 * /api/messages/bulk/button:
 *   post:
 *     tags: [Messages]
 *     summary: Send bulk messages with clickable button link
 *     description: Send WhatsApp messages to multiple recipients with a button that redirects to a URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetNumbers
 *               - message
 *               - buttonText
 *               - url
 *             properties:
 *               targetNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone numbers to send the message to
 *                 example: ["628123456789", "628987654321"]
 *               message:
 *                 type: string
 *                 description: Main message text (supports emoji codes)
 *                 example: "Special Promo! :fire:\nClick the button below to learn more"
 *               buttonText:
 *                 type: string
 *                 description: Text to display on the button
 *                 example: "View Offer"
 *               url:
 *                 type: string
 *                 description: URL to redirect to when button is clicked
 *                 example: "https://example.com/promo"
 *               footerText:
 *                 type: string
 *                 description: Optional text to display below the button
 *                 example: "Limited time offer"
 *               baseDelay:
 *                 type: integer
 *                 description: Base delay between messages in seconds
 *                 default: 30
 *               intervalDelay:
 *                 type: integer
 *                 description: Random additional delay between messages
 *                 default: 10
 *     responses:
 *       200:
 *         description: Messages queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     bulkId:
 *                       type: integer
 *                     totalMessages:
 *                       type: integer
 *                     activeSessionsCount:
 *                       type: integer
 *                     estimatedTimeMinutes:
 *                       type: integer
 *       400:
 *         description: Invalid input or insufficient messages in plan
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Add the new route
router.post('/messages/bulk/button', auth, messageController.sendBulkButtonMessages);

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Admin
 *     description: Admin-only operations for managing system data
 *   - name: WhatsApp
 *     description: WhatsApp session management
 *   - name: Messages
 *     description: Message operations
 *   - name: Plans
 *     description: Plan management
 *   - name: User Stats
 *     description: User statistics and profile management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/admin/whatsapp-sessions:
 *   get:
 *     tags: [Admin]
 *     summary: Get all WhatsApp sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all WhatsApp sessions with stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       phone_number:
 *                         type: string
 *                       status:
 *                         type: string
 *                       owner_username:
 *                         type: string
 *                       total_messages:
 *                         type: integer
 *                       sent_messages:
 *                         type: integer
 *                       failed_messages:
 *                         type: integer
 *
 * /api/admin/whatsapp-sessions/{sessionId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a WhatsApp session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *
 * /api/admin/bulk-messages:
 *   get:
 *     tags: [Admin]
 *     summary: Get all bulk messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         default: 10
 *     responses:
 *       200:
 *         description: List of bulk messages with pagination
 *
 * /api/admin/bulk-messages/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a bulk message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bulk message deleted successfully
 *
 * /api/admin/message-bulks:
 *   get:
 *     tags: [Admin]
 *     summary: Get all message bulks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of message bulks with statistics
 *
 * /api/admin/message-bulks/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a message bulk and its associated messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Message bulk deleted successfully
 *
 * /api/admin/messages:
 *   get:
 *     tags: [Admin]
 *     summary: Get all messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages with sender details
 *
 * /api/admin/messages/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *
 * /api/admin/metrics:
 *   get:
 *     tags: [Admin]
 *     summary: Get all metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of metrics with user details
 *
 * /api/admin/metrics/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a metric
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Metric deleted successfully
 */

// Admin routes
router.get('/admin/whatsapp-sessions', auth, isAdmin, adminController.getWhatsappSessions);
router.delete('/admin/whatsapp-sessions/:sessionId', auth, isAdmin, adminController.deleteWhatsappSession);
router.get('/admin/bulk-messages', auth, isAdmin, adminController.getBulkMessages);
router.delete('/admin/bulk-messages/:id', auth, isAdmin, adminController.deleteBulkMessage);
router.get('/admin/message-bulks', auth, isAdmin, adminController.getMessageBulks);
router.delete('/admin/message-bulks/:id', auth, isAdmin, adminController.deleteMessageBulk);
router.get('/admin/messages', auth, isAdmin, adminController.getMessages);
router.delete('/admin/messages/:id', auth, isAdmin, adminController.deleteMessage);
router.get('/admin/metrics', auth, isAdmin, adminController.getMetrics);
router.delete('/admin/metrics/:id', auth, isAdmin, adminController.deleteMetric);


/**
 * @swagger
 * /api/reports/transactions:
 *   get:
 *     tags: [Reports]
 *     summary: Get transaction report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [purchase, topup]
 *         description: Filter by transaction type
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [online, offline]
 *         description: Filter by payment method
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Transaction report data
 * 
 * /api/reports/transactions/summary:
 *   get:
 *     tags: [Reports]
 *     summary: Get transaction summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction summary data grouped by month and payment method
 */

// Add these routes to your api.js
router.get('/reports/transactions', auth, isAdmin, reportController.getTransactionReport);
router.get('/reports/transactions/summary', auth, isAdmin, reportController.getTransactionSummary);

/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a new payment transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - paymentMethod
 *               - merchantOrderId
 *             properties:
 *               planId:
 *                 type: integer
 *                 description: ID of the plan being purchased
 *               paymentMethod:
 *                 type: string
 *                 enum: [BC, M2, VA, B1, BT, OV, DA, SP]
 *                 description: Payment method code (BC=BCA VA, M2=Mandiri VA, etc)
 *               merchantOrderId:
 *                 type: string
 *                 description: Unique order ID generated by frontend
 *                 example: "ORDER202502011234ABC"
 *     responses:
 *       200:
 *         description: Payment transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantCode:
 *                       type: string
 *                       example: "DXXXX"
 *                     reference:
 *                       type: string
 *                       example: "DXXXXCX80TZJ85Q70QCI"
 *                     paymentUrl:
 *                       type: string
 *                       example: "https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BC7WZ7EIDXXXXWEC"
 *                     vaNumber:
 *                       type: string
 *                       example: "7007014001444348"
 *                     qrString:
 *                       type: string
 *                       example: "00020101021226660014ID.DANA.WWW..."
 *                     amount:
 *                       type: string
 *                       example: "40000"
 *                     statusCode:
 *                       type: string
 *                       example: "00"
 *                     statusMessage:
 *                       type: string
 *                       example: "SUCCESS"
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Server error
 */
router.post('/payments/create', auth, paymentController.createTransaction);

/**
 * @swagger
 * /api/payments/callback:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Payment callback endpoint for Duitku
 *     description: Endpoint to receive payment notifications from Duitku
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - merchantCode
 *               - amount
 *               - merchantOrderId
 *               - signature
 *             properties:
 *               merchantCode:
 *                 type: string
 *                 description: Merchant code from Duitku
 *               amount:
 *                 type: string
 *                 description: Transaction amount
 *               merchantOrderId:
 *                 type: string
 *                 description: Original order ID from merchant
 *               productDetail:
 *                 type: string
 *                 description: Product details
 *               additionalParam:
 *                 type: string
 *                 description: Additional parameters
 *               paymentCode:
 *                 type: string
 *                 description: Payment method code
 *               resultCode:
 *                 type: string
 *                 description: Transaction result (00=Success, 01=Failed)
 *               merchantUserId:
 *                 type: string
 *                 description: Customer username or email
 *               reference:
 *                 type: string
 *                 description: Transaction reference from Duitku
 *               signature:
 *                 type: string
 *                 description: Security signature
 *               publisherOrderId:
 *                 type: string
 *                 description: Unique payment ID from Duitku
 *               spUserHash:
 *                 type: string
 *                 description: ShopeePay user hash (if applicable)
 *               settlementDate:
 *                 type: string
 *                 format: date
 *                 description: Estimated settlement date (YYYY-MM-DD)
 *               issuerCode:
 *                 type: string
 *                 description: QRIS issuer code
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 *       500:
 *         description: Internal server error
 */
router.post('/payments/callback', express.urlencoded({ extended: true }), paymentController.handleCallback);

/**
 * @swagger
 * /api/payments/status/{merchantOrderId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Check payment transaction status
 *     parameters:
 *       - in: path
 *         name: merchantOrderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant order ID to check
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantOrderId:
 *                       type: string
 *                     reference:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     statusCode:
 *                       type: string
 *                     statusMessage:
 *                       type: string
 *                     paidTime:
 *                       type: string
 *                       format: date-time
 * 
 * /api/payments/poll/{merchantOrderId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Poll payment status until completion or timeout
 *     parameters:
 *       - in: path
 *         name: merchantOrderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant order ID to poll
 *     responses:
 *       200:
 *         description: Payment status polling completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     merchantOrderId:
 *                       type: string
 *                     reference:
 *                       type: string
 */

// Add these routes to your existing routes
router.get('/payments/status/:merchantOrderId', auth, paymentController.checkTransactionStatus);
router.get('/payments/poll/:merchantOrderId', auth, paymentController.pollTransactionStatus);

// Route implementation
router.post('/messages/bulk/send',
    auth,
    upload.single('image'),
    handleMulterError,
    messageController.sendBulkMessages
);

router.get('/messages/bulk/:bulkId/status', auth, messageController.getBulkStatus);
router.get('/messages/bulk/history', auth, messageController.getBulkHistory);


module.exports = router;