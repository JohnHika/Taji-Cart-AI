// Escapes regex special characters so user-supplied search text is treated as
// a literal substring, not a regex pattern. Without this, a public search
// endpoint accepting raw text into a MongoDB $regex is a ReDoS vector — a
// crafted catastrophic-backtracking pattern can hang the query far longer
// than any legitimate request would.
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;
