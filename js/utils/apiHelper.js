export const globalOpts = {
  "pageSize": 100, // Number | Page size
  "pageNumber": 1, // Number | Page number
};

export async function getAllPages(apiFunction, opts) {
  let allResults = [];
  let response;

  do {
    response = await apiFunction(opts);
    allResults = allResults.concat(response.entities);
    opts.pageNumber++;
  } while (response.nextUri);

  return allResults;
}
