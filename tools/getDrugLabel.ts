// tools/getDrugLabel.ts

const getDrugLabel = async (args: { drugName: string }) => {
  const { drugName } = args;

  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${drugName}"&limit=1`;
  const response = await fetch(url);
  const data = await response.json();

  const label = data.results?.[0];
  if (!label) {
    return JSON.stringify({ error: `No label found for ${drugName}` });
  }

  return JSON.stringify({
    drugName,
    contraindications: (label.contraindications ?? []).join(" ").slice(0, 500),
    warnings: (label.warnings ?? []).join(" ").slice(0, 500),
    drugInteractions: (label.drug_interactions ?? []).join(" ").slice(0, 500),
    geriatricUse: (label.geriatric_use ?? []).join(" ").slice(0, 500),
  });
};

export { getDrugLabel };
