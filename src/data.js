
// Wrapper for the name dataset which links it up into this format:
//
// {
//   "year": {
//     "M": { "STATE": "NAME", ... },
//     "F": { "STATE": "NAME", ... }
//   },
//   ...
// }

import {
  tsvParse
} from 'd3-dsv';

import countsTsv from '../data/counts_by_year.tsv';

const counts = {};
tsvParse(countsTsv).forEach((count) => {
  count.year = +count.year;
  count.count = +count.count;
  counts[count.year] = counts[count.year] || {
    M: {},
    F: {}
  };
  counts[count.year].M[count.state] = count.m;
  counts[count.year].F[count.state] = count.f;
});

export default counts;
