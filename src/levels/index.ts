/**
 * 关卡注册表。数组下标 = levelIndex（0 起），id = 下标 + 1。
 */
import type { LevelDef } from './types'
import menuScene from './menuScene'
import level1 from './level1'
import level2 from './level2'
import level3 from './level3'
import level4 from './level4'
import level5 from './level5'
import level6 from './level6'
import level7 from './level7'
import level8 from './level8'

export const MENU_SCENE: LevelDef = menuScene
export const LEVELS: LevelDef[] = [level1, level2, level3, level4, level5, level6, level7, level8]

export { makeLevel } from './builders'
export * from './types'
