import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeAgoPt } from '../src/utils/time.ts';

test('formatTimeAgoPt returns relative value in pt-BR', () => {
  const now = new Date('2026-02-23T16:00:00.000Z');
  const fiveMinutesAgo = new Date('2026-02-23T15:55:00.000Z');
  const value = formatTimeAgoPt(fiveMinutesAgo, now);

  assert.match(value, /5 minutos|há 5 min|5 min/i);
});

test('formatTimeAgoPt handles future dates', () => {
  const now = new Date('2026-02-23T16:00:00.000Z');
  const tomorrow = new Date('2026-02-24T16:00:00.000Z');
  const value = formatTimeAgoPt(tomorrow, now);

  assert.match(value, /amanhã|1 dia/i);
});

test('formatTimeAgoPt handles month and year ranges', () => {
  const now = new Date('2026-02-23T16:00:00.000Z');
  const twoMonthsAgo = new Date('2025-12-20T16:00:00.000Z');
  const twoYearsAgo = new Date('2024-02-23T16:00:00.000Z');

  const monthValue = formatTimeAgoPt(twoMonthsAgo, now);
  const yearValue = formatTimeAgoPt(twoYearsAgo, now);

  assert.match(monthValue, /2 meses|há 2 meses/i);
  assert.match(yearValue, /2 anos|há 2 anos/i);
});

test('formatTimeAgoPt covers seconds and hours branches with string input', () => {
  const now = new Date('2026-02-23T16:00:00.000Z');
  const thirtySecondsAgo = '2026-02-23T15:59:30.000Z';
  const threeHoursAgo = '2026-02-23T13:00:00.000Z';

  const secondsValue = formatTimeAgoPt(thirtySecondsAgo, now);
  const hoursValue = formatTimeAgoPt(threeHoursAgo, now);

  assert.match(secondsValue, /segundo|30 segundos/i);
  assert.match(hoursValue, /3 horas|há 3 horas/i);
});
