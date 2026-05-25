export const IS_BETA = process.env.NEXT_PUBLIC_BETA_MODE === 'true'
export const LEVEL2_THRESHOLD = IS_BETA ? 5 : 50
export const LEVEL3_THRESHOLD = IS_BETA ? 20 : 200
