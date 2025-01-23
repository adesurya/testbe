const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
   async googleSignIn(req, res) {
       const connection = await pool.getConnection();
       try {
           const { idToken } = req.body;
           
           const ticket = await client.verifyIdToken({
               idToken,
               audience: process.env.GOOGLE_CLIENT_ID
           });
           
           const { email, name, picture } = ticket.getPayload();

           await connection.beginTransaction();

           // Check if user exists
           let [user] = await connection.query(
               'SELECT * FROM users WHERE email = ?',
               [email]
           );

           let userId;

           if (user.length === 0) {
               // Create new user
               const [result] = await connection.query(
                   `INSERT INTO users 
                    (username, email, google_id, profile_picture, role, status, oauth_provider) 
                    VALUES (?, ?, ?, ?, 'user', 'active', 'google')`,
                   [name, email, ticket.getUserId(), picture]
               );
               userId = result.insertId;
           } else {
               userId = user[0].id;
               // Update existing user
               await connection.query(
                   `UPDATE users 
                    SET google_id = ?, profile_picture = ?, oauth_provider = 'google'
                    WHERE id = ?`,
                   [ticket.getUserId(), picture, userId]
               );
           }

           // Generate JWT token
           const token = jwt.sign(
               { id: userId, role: 'user' },
               process.env.JWT_SECRET,
               { expiresIn: '24h' }
           );

           await connection.commit();

           res.json({
               success: true,
               token,
               user: {
                   id: userId,
                   username: name,
                   email,
                   profilePicture: picture
               }
           });
       } catch (error) {
           await connection.rollback();
           res.status(500).json({
               success: false, 
               error: error.message
           });
       } finally {
           connection.release();
       }
   }
}

module.exports = new AuthController();