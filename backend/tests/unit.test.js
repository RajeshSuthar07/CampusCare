import { describe, it, expect } from 'vitest';
import { suggestPriority, resolveInitialPriority } from '../src/utils/priority.js';
import { computeTargetDate, computeTargetHours, getSlaInfo } from '../src/utils/sla.js';
import { canTransition, allowedNextStatuses } from '../src/utils/workflow.js';
import { detectImageType } from '../src/middleware/upload.js';
import { DEFAULT_SLA_HOURS } from '../src/utils/constants.js';
import { registerBody, assignBody } from '../src/validators/schemas.js';

describe('smart priority suggestion', () => {
  it('rates a complete lab power failure above a minor furniture issue', () => {
    const lab = suggestPriority({
      categoryName: 'Electricity',
      title: 'Complete power failure in Lab 3',
      description: 'The entire lab has no electricity and practical exams are tomorrow.',
    });
    const chair = suggestPriority({
      categoryName: 'Classroom Facilities',
      title: 'Loose chair',
      description: 'A small issue: one chair is slightly loose.',
    });
    expect(['high', 'critical']).toContain(lab.priority);
    expect(chair.priority).toBe('low');
    expect(lab.score).toBeGreaterThan(chair.score);
    expect(lab.reasons.length).toBeGreaterThan(0); // transparent: reasons are returned
  });

  it('flags safety hazards as critical', () => {
    const r = suggestPriority({ categoryName: 'Electricity', title: 'Sparks from socket', description: 'Sparking and a burning smell near the wall.' });
    expect(r.priority).toBe('critical');
  });

  it('does not let students self-select critical', () => {
    expect(resolveInitialPriority({ studentChoice: 'critical', suggested: 'low' }).priority).toBe('high');
    expect(resolveInitialPriority({ studentChoice: 'low', suggested: 'critical' }).priority).toBe('critical');
  });
});

describe('SLA calculation', () => {
  it('uses the stricter of priority SLA and category limit', () => {
    expect(computeTargetHours('medium', DEFAULT_SLA_HOURS, 48)).toBe(48);
    expect(computeTargetHours('critical', DEFAULT_SLA_HOURS, 48)).toBe(8);
  });

  it('reports remaining time, at-risk and overdue states', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const target = computeTargetDate(created, 10);
    const base = { status: 'in_progress', createdAt: created, targetResolutionAt: target };
    expect(getSlaInfo(base, new Date('2026-01-01T02:00:00Z')).state).toBe('on_track');
    expect(getSlaInfo(base, new Date('2026-01-01T09:00:00Z')).state).toBe('at_risk');
    const late = getSlaInfo(base, new Date('2026-01-01T11:00:00Z'));
    expect(late.state).toBe('overdue');
    expect(late.isOverdue).toBe(true);
    expect(late.remainingMs).toBeLessThan(0);
  });

  it('marks finished complaints as met or missed', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const target = computeTargetDate(created, 10);
    expect(getSlaInfo({ status: 'resolved', createdAt: created, targetResolutionAt: target, resolvedAt: new Date('2026-01-01T05:00:00Z') }).state).toBe('met');
    expect(getSlaInfo({ status: 'resolved', createdAt: created, targetResolutionAt: target, resolvedAt: new Date('2026-01-02T05:00:00Z') }).state).toBe('missed');
  });
});

describe('status workflow', () => {
  it('stops students from resolving or closing their own complaints', () => {
    expect(canTransition('student', 'in_progress', 'resolved')).toBe(false);
    expect(canTransition('student', 'resolved', 'closed')).toBe(false);
    expect(canTransition('student', 'submitted', 'cancelled')).toBe(true);
  });
  it('follows Submitted -> Under Review -> Assigned -> In Progress -> Resolved -> Closed', () => {
    expect(canTransition('admin', 'submitted', 'under_review')).toBe(true);
    expect(canTransition('admin', 'submitted', 'resolved')).toBe(false);
    expect(canTransition('staff', 'assigned', 'in_progress')).toBe(true);
    expect(canTransition('staff', 'in_progress', 'resolved')).toBe(true);
    expect(canTransition('staff', 'resolved', 'closed')).toBe(false);
    expect(canTransition('admin', 'resolved', 'closed')).toBe(true);
    expect(allowedNextStatuses('admin', 'closed')).toEqual([]);
  });
});

describe('image validation', () => {
  it('detects real images by magic bytes and rejects fakes', () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(12)]);
    expect(detectImageType(png)).toBe('png');
    expect(detectImageType(jpg)).toBe('jpeg');
    expect(detectImageType(Buffer.from('<?php echo 1; ?> not an image at all'))).toBeNull();
  });
});

describe('request schemas', () => {
  it('strips a role supplied at registration', () => {
    const parsed = registerBody.parse({ name: 'Asha', email: 'ASHA@Example.com ', password: 'abcdefg1', role: 'admin' });
    expect(parsed.role).toBeUndefined();
    expect(parsed.email).toBe('asha@example.com');
  });
  it('requires a department or staff member to assign', () => {
    expect(assignBody.safeParse({}).success).toBe(false);
  });
});
