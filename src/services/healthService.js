const supabase = require('../config/supabase');

/**
 * Check if Supabase connection is active
 * @returns {Promise<{healthy: boolean, timestamp: string, message?: string}>}
 */
async function checkSupabaseHealth() {
  try {
    // Simple query to keep connection active and verify it's working
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        message: `Supabase error: ${error.message}`,
      };
    }

    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      message: 'Supabase connection active',
    };
  } catch (err) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      message: `Connection check failed: ${err.message}`,
    };
  }
}

/**
 * Get overall system health status
 * @returns {Promise<object>} Health status object
 */
async function getHealthStatus() {
  const supabaseHealth = await checkSupabaseHealth();

  return {
    status: supabaseHealth.healthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: supabaseHealth,
  };
}

module.exports = {
  checkSupabaseHealth,
  getHealthStatus,
};
