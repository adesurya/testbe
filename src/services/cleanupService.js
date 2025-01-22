// src/services/cleanupService.js
const fs = require('fs').promises;
const path = require('path');
const rimraf = require('rimraf');
const util = require('util');
const rimrafPromise = util.promisify(rimraf);

class CleanupService {
    static async removeDirectory(directoryPath) {
        try {
            await rimrafPromise(directoryPath);
            console.log(`Successfully removed directory: ${directoryPath}`);
        } catch (error) {
            console.error(`Error removing directory ${directoryPath}:`, error);
        }
    }

    static async cleanup() {
        try {
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            const cachePath = path.join(process.cwd(), '.wwebjs_cache');
            
            console.log('Starting cleanup process...');
            
            // Remove auth directory
            await this.removeDirectory(authPath);
            
            // Remove cache directory
            await this.removeDirectory(cachePath);
            
            console.log('Cleanup completed successfully');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

module.exports = CleanupService;