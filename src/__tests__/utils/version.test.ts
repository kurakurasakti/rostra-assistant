import { describe, expect, it } from "vitest"
import packageJson from "../../../package.json"
import { APP_VERSION } from "../../../lib/version"

describe("APP_VERSION", () => {
  it("should match package.json version", () => {
    expect(APP_VERSION).toBe(packageJson.version)
  })

  it("should be valid semver format", () => {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/
    expect(APP_VERSION).toMatch(semverRegex)
  })
})
