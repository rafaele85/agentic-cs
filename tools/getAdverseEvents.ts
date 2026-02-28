// tools/getAdverseEvents.ts

const getAdverseEvents = async (args: {
  drugName: string;
  reaction?: string;
}) => {
  const { drugName, reaction } = args;

  let search = `patient.drug.medicinalproduct:"${drugName}"`;
  if (reaction) {
    search += `+AND+patient.reaction.reactionmeddrapt:"${reaction}"`;
  }

  const countUrl = `https://api.fda.gov/drug/event.json?search=${search}&count=patient.reaction.reactionmeddrapt.exact&limit=5`;
  const totalUrl = `https://api.fda.gov/drug/event.json?search=${search}&limit=1`;

  const [countRes, totalRes] = await Promise.all([
    fetch(countUrl),
    fetch(totalUrl),
  ]);

  const countData = await countRes.json();
  const totalData = await totalRes.json();

  return JSON.stringify({
    drugName,
    totalReports: totalData.meta?.results?.total ?? 0,
    topReactions: (countData.results ?? []).map((r: any) => ({
      reaction: r.term,
      count: r.count,
    })),
  });
};

export { getAdverseEvents };
