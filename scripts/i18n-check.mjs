import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const enPath = path.join(rootDir, 'messages', 'en.json')
const hiPath = path.join(rootDir, 'messages', 'hi.json')
const mrPath = path.join(rootDir, 'messages', 'mr.json')

function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message)
    process.exit(1)
  }
}

const en = loadJson(enPath)
const hi = loadJson(hiPath)
const mr = loadJson(mrPath)

function flattenKeys(obj, prefix = '') {
  let res = {}
  for (const [key, val] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(res, flattenKeys(val, fullPath))
    } else {
      res[fullPath] = val
    }
  }
  return res
}

function extractVariables(str) {
  if (typeof str !== 'string') return []
  const matches = Array.from(str.matchAll(/\{([a-zA-Z0-9_]+)[,\s\}]/g), (m) => m[1])
  return Array.from(new Set(matches)).sort()
}

const enFlat = flattenKeys(en)
const hiFlat = flattenKeys(hi)
const mrFlat = flattenKeys(mr)

let errors = []

// Check hi and mr against en
for (const [key, enVal] of Object.entries(enFlat)) {
  const enVars = extractVariables(enVal)

  // Check hi
  if (!(key in hiFlat)) {
    errors.push(`[hi] Missing key: ${key}`)
  } else {
    const hiVars = extractVariables(hiFlat[key])
    const missingInHi = enVars.filter((v) => !hiVars.includes(v))
    const extraInHi = hiVars.filter((v) => !enVars.includes(v))
    if (missingInHi.length > 0 || extraInHi.length > 0) {
      errors.push(`[hi] Variable mismatch for "${key}": expected [${enVars.join(', ')}], got [${hiVars.join(', ')}]`)
    }
  }

  // Check mr
  if (!(key in mrFlat)) {
    errors.push(`[mr] Missing key: ${key}`)
  } else {
    const mrVars = extractVariables(mrFlat[key])
    const missingInMr = enVars.filter((v) => !mrVars.includes(v))
    const extraInMr = mrVars.filter((v) => !enVars.includes(v))
    if (missingInMr.length > 0 || extraInMr.length > 0) {
      errors.push(`[mr] Variable mismatch for "${key}": expected [${enVars.join(', ')}], got [${mrVars.join(', ')}]`)
    }
  }
}

// Check for orphaned keys in hi or mr
for (const key of Object.keys(hiFlat)) {
  if (!(key in enFlat)) {
    errors.push(`[hi] Extra key not in en.json: ${key}`)
  }
}
for (const key of Object.keys(mrFlat)) {
  if (!(key in enFlat)) {
    errors.push(`[mr] Extra key not in en.json: ${key}`)
  }
}

if (errors.length > 0) {
  console.error(`i18n check failed with ${errors.length} error(s):`)
  errors.forEach((err) => console.error(` - ${err}`))
  process.exit(1)
} else {
  console.log(`i18n check passed: ${Object.keys(enFlat).length} keys verified across en, hi, mr with zero variable mismatches.`)
  process.exit(0)
}
