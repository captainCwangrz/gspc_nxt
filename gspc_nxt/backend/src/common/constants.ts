export enum RelationType {
  DATING = 'DATING',
  BEST_FRIEND = 'BEST_FRIEND',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
  BEEFING = 'BEEFING',
  CRUSH = 'CRUSH',
}

export const RELATION_TYPES: RelationType[] = [
  RelationType.DATING,
  RelationType.BEST_FRIEND,
  RelationType.BROTHER,
  RelationType.SISTER,
  RelationType.BEEFING,
  RelationType.CRUSH,
];

export const DIRECTED_RELATION_TYPES: RelationType[] = [RelationType.CRUSH];

export const RELATION_STYLES = {
  [RelationType.DATING]: { color: '#ec4899', particle: true, label: '❤️ Dating' },
  [RelationType.BEST_FRIEND]: {
    color: '#3b82f6',
    particle: true,
    label: '💎 Bestie',
  },
  [RelationType.BROTHER]: { color: '#10b981', particle: true, label: '👊 Bro' },
  [RelationType.SISTER]: { color: '#10b981', particle: true, label: '🌸 Sis' },
  [RelationType.BEEFING]: { color: '#ef4444', particle: true, label: '💀 Beefing' },
  [RelationType.CRUSH]: { color: '#a855f7', particle: true, label: '✨ Crush' },
};

export const AVATARS = ['1.png', '2.png', '3.png'];
export const FALLBACK_AVATAR = '0.png';

export const isDirectedType = (type: RelationType): boolean =>
  DIRECTED_RELATION_TYPES.includes(type);

export const normalizeFromTo = (
  type: RelationType,
  fromId: number,
  toId: number,
): [number, number] => {
  if (isDirectedType(type)) {
    return [fromId, toId];
  }

  return fromId < toId ? [fromId, toId] : [toId, fromId];
};
