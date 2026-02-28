// tools/searchClinicalTrials.ts

const searchClinicalTrials = async (args: {
  query: string;
  ageGroup?: string;
}) => {
  const { query, ageGroup } = args;
  const searchTerm = ageGroup ? `${query} ${ageGroup}` : query;

  const params = new URLSearchParams({
    "query.term": searchTerm,
    pageSize: "5",
    format: "json",
    countTotal: "true",
  });

  const url = `https://clinicaltrials.gov/api/v2/studies?${params}`;
  const response = await fetch(url);
  const data = await response.json();

  const trials = (data.studies ?? []).map((study: any) => {
    const p = study.protocolSection ?? {};
    return {
      nctId: p.identificationModule?.nctId ?? "N/A",
      title: p.identificationModule?.briefTitle ?? "N/A",
      phase: (p.designModule?.phases ?? []).join(", ") || "N/A",
      status: p.statusModule?.overallStatus ?? "N/A",
      enrollment: p.designModule?.enrollmentInfo?.count ?? null,
      summary: (p.descriptionModule?.briefSummary ?? "").slice(0, 300),
    };
  });

  return JSON.stringify({ totalFound: data.totalCount ?? 0, trials });
};

export { searchClinicalTrials };
