import { Request, Response } from 'express';
import { UserService, DeviceService, AuditService } from '../services';

/**
 * Register a trusted device.
 * POST /api/devices/register
 */
export async function registerDevice(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { deviceFingerprint, label, encryptedRecoveryData } = req.body;

    if (!deviceFingerprint || !label) {
      return res.status(400).json({ error: 'deviceFingerprint and label are required.' });
    }

    const dbUser = await UserService.findOrCreate(user.address);

    const device = await DeviceService.register(dbUser.id, {
      deviceFingerprint: String(deviceFingerprint),
      label: String(label).slice(0, 100),
      encryptedRecoveryData: encryptedRecoveryData ? String(encryptedRecoveryData) : undefined,
    });

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'device.registered',
      metadata: { deviceId: device.id, label: device.label },
      ipAddress: req.ip || undefined,
    });

    return res.status(201).json({
      status: 'success',
      device: {
        id: device.id,
        label: device.label,
        deviceFingerprint: device.deviceFingerprint,
        createdAt: device.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error.message?.includes('Maximum of 3')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error in registerDevice:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * List active trusted devices.
 * GET /api/devices
 */
export async function listDevices(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(200).json([]);

    const devices = await DeviceService.listActive(dbUser.id);
    return res.status(200).json(devices);
  } catch (error) {
    console.error('Error in listDevices:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Revoke a trusted device.
 * DELETE /api/devices/:id
 */
export async function revokeDevice(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { id } = req.params;
    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const revoked = await DeviceService.revoke(dbUser.id, id);
    if (!revoked) {
      return res.status(404).json({ error: 'Device not found or already revoked.' });
    }

    await AuditService.log({
      userId: dbUser.id,
      eventType: 'device.revoked',
      metadata: { deviceId: id },
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({ status: 'success', message: 'Device revoked.' });
  } catch (error) {
    console.error('Error in revokeDevice:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Verify device ownership by fingerprint.
 * POST /api/devices/verify
 */
export async function verifyDevice(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.address) return res.status(401).json({ error: 'Unauthorized.' });

    const { deviceFingerprint } = req.body;
    if (!deviceFingerprint) {
      return res.status(400).json({ error: 'deviceFingerprint is required.' });
    }

    const dbUser = await UserService.findByAddress(user.address);
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const device = await DeviceService.verify(dbUser.id, deviceFingerprint);
    if (!device) {
      return res.status(404).json({ error: 'Device not recognized or revoked.' });
    }

    return res.status(200).json({
      status: 'verified',
      device: {
        id: device.id,
        label: device.label,
        lastUsedAt: device.lastUsedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in verifyDevice:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
