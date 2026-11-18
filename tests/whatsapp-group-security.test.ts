import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/participante/whatsapp-group/route';

vi.mock('../src/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../src/lib/db/client', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../src/lib/db/repository', () => ({
  getEnrollmentById: vi.fn(),
}));

import { getCurrentUser } from '../src/lib/auth/session';
import { getDatabase } from '../src/lib/db/client';
import { getEnrollmentById } from '../src/lib/db/repository';

describe('GET /api/participante/whatsapp-group', () => {
  const mockDb = {
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabase).mockReturnValue(mockDb as any);
  });

  it('debe rechazar con 401 si el usuario es anónimo o no está autenticado', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group?ofertaId=OF-BIOMEC-2026-11');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('debe rechazar con 400 si falta el parámetro ofertaId o enrollmentId', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-123',
      email: 'test@example.com',
      role: 'participante',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('BAD_REQUEST');
  });

  it('debe rechazar con 403 si el usuario registrado no tiene inscripción en la edición solicitada', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-123',
      email: 'test@example.com',
      role: 'participante',
    } as any);

    mockDb.get.mockResolvedValue(null); // No enrollment found

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group?ofertaId=OF-BIOMEC-2026-11');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('FORBIDDEN');
    expect(data.message).toMatch(/No se encontró una inscripción confirmada/);
  });

  it('debe rechazar con 403 si la inscripción está en estado pendiente (por enrollmentId)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-123',
      email: 'test@example.com',
      role: 'participante',
    } as any);

    vi.mocked(getEnrollmentById).mockResolvedValue({
      id: 'enr-999',
      user_id: 'usr-123',
      oferta_id: 'OF-BIOMEC-2026-11',
      status: 'pendiente',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group?enrollmentId=enr-999');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('FORBIDDEN');
    expect(data.message).toMatch(/inscripción confirmada/);
  });

  it('debe rechazar con 403 si la inscripción pertenece a otro usuario', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-123',
      email: 'test@example.com',
      role: 'participante',
    } as any);

    vi.mocked(getEnrollmentById).mockResolvedValue({
      id: 'enr-999',
      user_id: 'other-user-456',
      oferta_id: 'OF-BIOMEC-2026-11',
      status: 'confirmada',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group?enrollmentId=enr-999');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('FORBIDDEN');
    expect(data.message).toMatch(/no autorizada/);
  });

  it('debe entregar el enlace con 200 si el usuario posee una inscripción confirmada para la oferta', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-123',
      email: 'test@example.com',
      role: 'participante',
    } as any);

    mockDb.get
      .mockResolvedValueOnce({ id: 'enr-valid' }) // validEnrollment
      .mockResolvedValueOnce({ whatsapp_group_url: 'https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk' }); // edition

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group?ofertaId=OF-BIOMEC-2026-11');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.whatsappGroupUrl).toBe('https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk');
  });

  it('debe entregar el enlace con 200 si se consulta por enrollmentId confirmado', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-123',
      email: 'test@example.com',
      role: 'participante',
    } as any);

    vi.mocked(getEnrollmentById).mockResolvedValue({
      id: 'enr-confirmed',
      user_id: 'usr-123',
      oferta_id: 'OF-BIOMEC-2026-11',
      status: 'confirmada',
    } as any);

    mockDb.get.mockResolvedValueOnce({ whatsapp_group_url: 'https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk' });

    const req = new NextRequest('http://localhost:3000/api/participante/whatsapp-group?enrollmentId=enr-confirmed');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.whatsappGroupUrl).toBe('https://chat.whatsapp.com/H2GeOaYVJx3HWU8ZSgKpsk');
  });
});
