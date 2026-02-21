/**
 * 텍스트 회전 각도 감지
 */

/**
 * 베이스라인으로 텍스트 회전 각도 추정
 */
export function calculateRotationAngle(baseline: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}): number {
  const dx = baseline.x1 - baseline.x0;
  const dy = baseline.y1 - baseline.y0;

  // 라디안을 도(degree)로 변환
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // 각도 정규화 (-180 ~ 180)
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;

  // 작은 각도는 0으로 처리 (오차 범위)
  if (Math.abs(angle) < 2) angle = 0;

  return angle;
}

/**
 * 각도를 45도 단위로 스냅
 */
export function snapToCommonAngle(angle: number): number {
  const commonAngles = [0, 45, 90, 135, 180, -45, -90, -135];

  return commonAngles.reduce((prev, curr) =>
    Math.abs(curr - angle) < Math.abs(prev - angle) ? curr : prev
  );
}

/**
 * 각도 정규화 (0 ~ 360)
 */
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}
