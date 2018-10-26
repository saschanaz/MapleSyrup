const fs = require("fs");
const path = require("path");
const maplesyrup = require("../lib/maplesyrup")

describe("Tests", () => {
  const cases = path.join(__dirname, "cases");
  const baselines = path.join(__dirname, "baselines")
  for (const casename of fs.readdirSync(cases)) {
    it(casename, () => {
      const caseText = fs.readFileSync(path.join(cases, casename), "utf-8");
      const converted = maplesyrup.convert(caseText.trimEnd());
      const baseline = fs.readFileSync(path.join(baselines, casename), "utf-8");
      if (converted !== baseline.trimEnd()) {
        throw new Error("Converted result is different from baseline data.");
      }
    });
  }
});
