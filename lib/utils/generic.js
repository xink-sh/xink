import { CONFIG } from "../constants.js"

/**
 * Generic utility which merges two objects.
 * 
 * @param {object} current
 * @param {object} updates
 * @returns {object}
 */
const mergeObjects = (current, updates) => {
  if (!current || !updates)
    throw new Error("Both 'current' and 'updates' must be passed-in to merge()")
  if (typeof current !== 'object' || typeof updates !== 'object' || Array.isArray(current) || Array.isArray(updates))
    throw new Error("Both 'current' and 'updates' must be passed-in as objects to merge()")

  let merged = { ...current }

  for (let key of Object.keys(updates)) {
    if (typeof updates[key] !== 'object') {
      merged[key] = updates[key]
    } else {
      /* key is an object, run mergeObjects again. */
      merged[key] = mergeObjects(merged[key] || {}, updates[key])
    }
  }

  return merged
}

/**
 * Merge a user config with the default config.
 * 
 * @param {import('xink').DefaultConfig} dconfig
 * @param {import('xink').Config} config
 * @returns {import('xink').ValidatedConfig}
 */
export const mergeConfig = (dconfig, config) => {
  /**
   * We need to make a deep copy of `dconfig`,
   * otherwise we end up altering the original `CONFIG` because `dconfig` is a reference to it.
   */
  return mergeObjects(structuredClone(dconfig), config)
}

/**
 * Validate any passed-in config options and merge with CONFIG.
 *
 * @param {import('xink').Config} config
 * @returns {import('xink').ValidatedConfig}
 */
export const validateConfig = (config) => {
  if (typeof config !== 'object') throw 'Config must be an object.'

  /* config empty? */
  if (Object.entries(config).length = 0) return CONFIG

  let route_dir = config.routes

  if (route_dir && typeof route_dir !== 'string') throw 'route_dir must be a string.'

  return mergeConfig(CONFIG, config)

}
