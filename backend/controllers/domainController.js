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
    const formattedDomains = domains.map((domain) => ({
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

/**
 * Get active domains with student counts for admin
 * Returns each domain with how many active students are assigned to it.
 */
exports.getDomainStats = async (req, res) => {
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
        _count: {
          select: {
            students: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        domainName: 'asc',
      },
    });

    const formatted = domains.map((domain) => ({
      id: domain.id,
      domain_name: domain.domainName,
      domain_code: domain.domainCode,
      description: domain.description,
      student_count: domain._count?.students || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Domain statistics retrieved successfully',
      domains: formatted,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching domain stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Create a new domain (admin only)
 *
 * Body:
 * - domain_name (required)
 * - description (optional)
 */
exports.createDomain = async (req, res) => {
  try {
    const { domain_name, description, domain_code } = req.body || {};

    if (!domain_name || !domain_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required',
      });
    }

    const trimmedName = domain_name.trim();

    // Check if domain with this name already exists (active).
    // NOTE: Prisma version here doesn't support `mode: 'insensitive'`,
    // but MySQL string comparisons are case-insensitive by default for
    // standard collations, so a simple equality check is enough.
    const existing = await prisma.domain.findFirst({
      where: {
        isActive: true,
        domainName: trimmedName,
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Domain with this name already exists',
      });
    }

    // Generate a code if not provided
    let finalCode = domain_code;
    if (!finalCode || !String(finalCode).trim()) {
      let baseCode = trimmedName
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');

      if (!baseCode) {
        baseCode = 'DOMAIN';
      }

      finalCode = baseCode;
      let counter = 1;
      // Ensure domainCode is unique
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await prisma.domain.findUnique({
          where: { domainCode: finalCode },
          select: { id: true },
        });
        if (!exists) break;
        finalCode = `${baseCode}_${counter}`;
        counter += 1;
      }
    }

    const domain = await prisma.domain.create({
      data: {
        domainName: trimmedName,
        domainCode: finalCode,
        description: description || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Domain created successfully',
      domain: {
        id: domain.id,
        domain_name: domain.domainName,
        domain_code: domain.domainCode,
        description: domain.description,
      },
    });
  } catch (error) {
    console.error('Error creating domain:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get active domains with student counts for admin
 * Returns each domain with how many active students are assigned to it.

 * Soft delete a domain and optionally reassign its students to another domain.
 *
 * If the domain has students and no target_domain_id is provided, the delete
 * will be rejected to avoid leaving students without a valid domain.
 *
 * Body params:
 * - target_domain_id (optional): domain ID to reassign students to before delete
 */
exports.deleteDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const domainId = parseInt(id, 10);

    if (!Number.isFinite(domainId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain ID',
      });
    }

    const { target_domain_id } = req.body || {};
    const targetDomainId = target_domain_id ? parseInt(target_domain_id, 10) : null;

    if (targetDomainId && targetDomainId === domainId) {
      return res.status(400).json({
        success: false,
        message: 'Target domain cannot be the same as the domain being deleted',
      });
    }

    // Ensure domain exists and is active
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select: {
        id: true,
        domainName: true,
        isActive: true,
      },
    });

    if (!domain || domain.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found',
      });
    }

    const studentCount = await prisma.student.count({
      where: {
        domainId,
        isActive: true,
      },
    });

    // If there are students and no target domain is provided, block deletion
    if (studentCount > 0 && !targetDomainId) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete domain because there are students assigned to it. Please choose a target domain to merge into, or move students first.',
        student_count: studentCount,
      });
    }

    await prisma.$transaction(async (tx) => {
      // If target domain is provided and there are students, validate target and reassign
      if (studentCount > 0 && targetDomainId) {
        const targetDomain = await tx.domain.findUnique({
          where: { id: targetDomainId },
          select: {
            id: true,
            isActive: true,
          },
        });

        if (!targetDomain || targetDomain.isActive === false) {
          throw new Error('Target domain not found or inactive');
        }

        await tx.student.updateMany({
          where: {
            domainId,
            isActive: true,
          },
          data: {
            domainId: targetDomainId,
          },
        });
      }

      // Soft delete the domain so historical references remain intact
      await tx.domain.update({
        where: { id: domainId },
        data: {
          isActive: false,
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Domain deleted successfully',
      student_count: studentCount,
      reassigned_to: targetDomainId || null,
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

