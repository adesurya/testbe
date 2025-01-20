// src/controllers/planController.js
const Plan = require('../models/Plan');

class PlanController {
    // Create new plan (Admin only)
    async createPlan(req, res) {
        try {
            const { name, messageLimit, price, durationDays } = req.body;
            
            const planId = await Plan.create({
                name,
                messageLimit,
                price,
                durationDays
            });

            res.status(201).json({
                message: 'Plan created successfully',
                planId
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update plan (Admin only)
    async updatePlan(req, res) {
        try {
            const { planId } = req.params;
            const { name, messageLimit, price, durationDays } = req.body;

            await Plan.update(planId, {
                name,
                messageLimit,
                price,
                durationDays
            });

            res.json({ message: 'Plan updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete plan (Admin only)
    async deletePlan(req, res) {
        try {
            const { planId } = req.params;
            await Plan.delete(planId);
            res.json({ message: 'Plan deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Assign plan to user
    async assignPlanToUser(req, res) {
        try {
            const { userId, planId, amount } = req.body;
            
            if (!userId || !planId) {
                return res.status(400).json({ 
                    error: 'userId and planId are required' 
                });
            }

            const result = await Plan.assignToUser(userId, planId, amount);
            
            res.json({
                message: 'Plan assigned successfully',
                userPlanId: result.userPlanId,
                planDetails: result.planDetails
            });

        } catch (error) {
            console.error('Error assigning plan:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Top up user plan
    async topupUserPlan(req, res) {
        try {
            const { userId, planId, messages, amount } = req.body;

            if (!userId || !planId || !messages || !amount) {
                return res.status(400).json({
                    error: 'userId, planId, messages, and amount are required'
                });
            }

            const result = await Plan.topupUserPlan(userId, planId, messages, amount);

            res.json({
                message: 'Plan topped up successfully',
                ...result
            });
        } catch (error) {
            console.error('Error in topupUserPlan:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get user plans
    async getUserPlans(req, res) {
        try {
            const { userId } = req.params;
            const plans = await Plan.getUserPlans(userId);
            res.json(plans);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Admin topup user plan
    async adminTopupUserPlan(req, res) {
        try {
            const { userId, planId, messages } = req.body;

            if (!userId || !planId || !messages) {
                return res.status(400).json({
                    error: 'userId, planId, and messages are required'
                });
            }

            const result = await Plan.topupUserPlan(userId, planId, messages, 0);

            res.json({
                message: 'Plan topped up by admin successfully',
                ...result
            });
        } catch (error) {
            console.error('Error in adminTopupUserPlan:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getPlanTransactions(req, res) {
        try {
            const { userId } = req.params;
            const transactions = await Plan.getPlanTransactions(userId);
            res.json(transactions);
        } catch (error) {
            console.error('Error getting transactions:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAllTransactions(req, res) {
        try {
            const transactions = await Plan.getAllTransactions();
            res.json(transactions);
        } catch (error) {
            console.error('Error getting all transactions:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PlanController();