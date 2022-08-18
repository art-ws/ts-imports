import { parseTypeScriptImport } from "../src/core/parse-imports"

describe("default", () => {
  it("parseTypeScriptImport", () => {
    ;[
      [`import { MomentVal } from "./moment-val"`, "./moment-val"],
      [`} from '@angular/core';`, "@angular/core"],
      [`import * as yaml from 'js-yaml';`, "js-yaml"],
      [`export * from './x-app-ui.module';`, "./x-app-ui.module"],
    ].forEach((x) => {
      expect(parseTypeScriptImport(x[0])).toBe(x[1])
    })
  })
})
