const { prisma } = require('../config/database');

const CANDIDATE_REGISTRATION_ENABLED_KEY = 'candidate_registration_enabled';

/**
 * Get app settings (Super Admin only).
 * GET /api/admin/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const registration = await prisma.systemSetting.findUnique({
      where: { key: CANDIDATE_REGISTRATION_ENABLED_KEY },
    });
    const candidate_registration_enabled =
      registration?.value === 'true';

    res.status(200).json({
      success: true,
      settings: {
        candidate_registration_enabled: !!candidate_registration_enabled,
      },
    });
  } catch (error) {
    console.error('Error in getSettings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update a setting (Super Admin only).
 * PUT /api/admin/settings
 * Body: { candidate_registration_enabled: true|false }
 */
exports.updateSettings = async (req, res) => {
  try {
    const { candidate_registration_enabled } = req.body;

    if (typeof candidate_registration_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'candidate_registration_enabled must be a boolean',
      });
    }

    await prisma.systemSetting.upsert({
      where: { key: CANDIDATE_REGISTRATION_ENABLED_KEY },
      create: {
        key: CANDIDATE_REGISTRATION_ENABLED_KEY,
        value: candidate_registration_enabled ? 'true' : 'false',
      },
      update: {
        value: candidate_registration_enabled ? 'true' : 'false',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Settings updated',
      settings: {
        candidate_registration_enabled,
      },
    });
  } catch (error) {
    console.error('Error in updateSettings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
