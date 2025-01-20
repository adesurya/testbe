// src/routes/api.js
const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const whatsappController = require('../controllers/whatsappController');
const messageController = require('../controllers/messageController');
const userController = require('../controllers/userController');
const planController = require('../controllers/planController');
const paymentController = require('../controllers/paymentController')
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
router.get('/users/:userId', auth, isAdmin, userController.getUserById);

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
router.put('/users/:userId', auth, isAdmin, userController.updateUser);

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
 * /api/payments/methods/{planId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get available payment methods for a plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/payments/methods/:planId', auth, paymentController.getPaymentMethods);

/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     tags: [Payments]
 *     summary: Create payment request
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
 */
router.post('/payments/create', auth, paymentController.createPayment);

/**
 * @swagger
 * /api/payments/callback:
 *   post:
 *     tags: [Payments]
 *     summary: Payment gateway callback endpoint
 */
router.post('/payments/callback', paymentController.handleCallback);

/**
 * @swagger
 * /api/payments/return:
 *   get:
 *     tags: [Payments]
 *     summary: Payment return URL
 */
router.get('/payments/return', paymentController.handleReturn);

/**
 * @swagger
 * /api/payments/status/{merchantOrderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Check payment status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantOrderId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/payments/status/:merchantOrderId', auth, paymentController.checkStatus);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get user payment history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user payments
 */

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get user payment history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user payments
 */
router.get('/payments/history', auth, paymentController.getPaymentHistory);

/**
 * @swagger
 * /api/payments/detail/{merchantOrderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment detail
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantOrderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment detail retrieved successfully
 */

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
 *     tags: [Messages]
 *     summary: Send bulk messages to multiple recipients
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
 *               - targetNumbers
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user sending messages
 *               targetNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone numbers to send messages to
 *               message:
 *                 type: string
 *                 description: Message content
 *               imagePath:
 *                 type: string
 *                 description: Optional path to image file
 *               baseDelay:
 *                 type: integer
 *                 description: Base delay between messages in seconds
 *                 default: 30
 *               intervalDelay:
 *                 type: integer
 *                 description: Random additional delay in seconds
 *                 default: 10
 *             example:
 *               userId: "123"
 *               targetNumbers: ["628123456789", "628234567890"]
 *               message: "Hello, this is a bulk message"
 *               baseDelay: 30
 *               intervalDelay: 10
 *     responses:
 *       200:
 *         description: Bulk messages queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bulkId:
 *                   type: integer
 *                   example: 1
 *                 totalMessages:
 *                   type: integer
 *                   example: 2
 *                 estimatedTimeMinutes:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
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


// Route implementation
router.post('/messages/bulk/send', auth, messageController.sendBulkMessages);
router.get('/messages/bulk/:bulkId/status', auth, messageController.getBulkStatus);
router.get('/messages/bulk/history', auth, messageController.getBulkHistory);

router.get('/payments/detail/:merchantOrderId', auth, paymentController.getPaymentDetail);
router.get('/payments/return', paymentController.handleReturn);
router.post('/payments/callback', paymentController.handleCallback);
router.get('/payments/detail/:merchantOrderId', auth, paymentController.getPaymentDetail);

module.exports = router;