const { prisma } = require('../config/database');

/**
 * Get all active domains
 */
exports.getAllDomains = async (req, res) => {
  try {
    const domains = await prisma.domain.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        domainName: true,
        domainCode: true,
        description: true,
      },
      orderBy: {
        domainName: 'asc',
      },
    });

    // Transform to match the expected format (snake_case for backward compatibility)
    const formattedDomains = domains.map(domain => ({
      id: domain.id,
      domain_name: domain.domainName,
      domain_code: domain.domainCode,
      description: domain.description,
    }));

    res.status(200).json({
      success: true,
      message: 'Domains retrieved successfully',
      domains: formattedDomains,
      data: formattedDomains, // Keep for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

