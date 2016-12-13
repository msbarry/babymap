
/**
 * Some gobbledy gook to generate colors for names such that no name in the same
 * year shares a color with another name that same year.  This is essentially
 * the graph coloring problem, where nodes are names and edges are co-occurrences
 * of 2 names in the same year.  I started with the 'welshpowell' package, but
 * needed to add a brute-force step afterwards to combine names that don't co-occur
 * to get the number of colors smaller;
 */

const tsvParse = require('d3-dsv').tsvParse;
const countsTsv = require('fs').readFileSync('data/counts_by_year.tsv').toString();
const { max, descending } = require('d3-array');
const { hsl } = require('d3-color');
const colorGraph = require('welshpowell').color;
const { schemeCategory20c, scaleLinear } = require('d3-scale');
const { interpolateLab } = require('d3-interpolate');

const schemeA = [];

for (let i = 0; i < schemeCategory20c.length / 4; i += 1) {
  const preScale = scaleLinear().domain([1, 4]).range([0.2, 1]);
  const scale = scaleLinear()
    .interpolate(interpolateLab)
    .domain([0, 1 / 3, 2 / 3, 3 / 3])
    .range([
      schemeCategory20c[(4 * i) + 0],
      schemeCategory20c[(4 * i) + 1],
      schemeCategory20c[(4 * i) + 2],
      schemeCategory20c[(4 * i) + 3]
    ]);
  schemeA.push(scale(preScale(1)));
  schemeA.push(scale(preScale(2)));
  schemeA.push(scale(preScale(3)));
  schemeA.push(scale(preScale(4)));
}

const scheme = schemeA.map((c) => {
  const color = hsl(c);
  return color.toString();
}).sort((a, b) => descending(hsl(a).l, hsl(b).l));

require('fs').writeFileSync('data/palette.html',
`
<body>
<style>
div {
  width: 25px;
  height: 25px;
  display: inline-block;
}
</style>
${scheme.map(color => `<div style='background-color: ${color}'></div>`).join('')}
`);

const result = {};

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

['M', 'F'].forEach((gender) => {
  const setsWithState = Object.values(counts)
    .map(yearData =>
      Object.keys(yearData[gender]).map(state => ({ state, name: yearData[gender][state] })));

  const labels = labelGraph(setsWithState);
  const maxCounts = {};
  setsWithState.forEach((set) => {
    const thisYear = {};
    set.forEach(({ name }) => {
      const label = labels[name];
      thisYear[label] = (thisYear[label] || 0) + 1;
      maxCounts[label] = Math.max(maxCounts[label] || 0, thisYear[label] || 0);
    });
  });
  const labelToNames = invert(labels);

  const allLabels = Object.keys(labelToNames)
    .sort((a, b) => descending(maxCounts[a], maxCounts[b]));

  allLabels.forEach((label, i) => {
    labelToNames[label].forEach((name) => {
      result[name] = scheme[i];
    });
  });
});

require('fs').writeFileSync('data/colors.json', JSON.stringify(result, null, 2));

function invert(map) {
  const inverted = {};
  Object.keys(map).forEach((key) => {
    const value = map[key];
    inverted[value] = inverted[value] || [];
    inverted[value].push(key);
  });
  return inverted;
}

function labelGraph(sets) {
  const all = {};
  const pairs = {};
  sets.forEach((set) => {
    set.forEach(({ name: item }) => {
      all[item] = true;
      set.forEach(({ name: other }) => {
        pairs[`${item}${other}`] = [item, other];
        pairs[`${other}${item}`] = [other, item];
      });
    });
  });
  const allKeys = Object.keys(all);
  let ret = colorGraph({
    vertices: allKeys,
    edges: Object.values(pairs)
  });
  let mapping = {};
  let labelToNames = {};
  function recompute() {
    mapping = {};
    allKeys.forEach((key, i) => {
      mapping[key] = ret[i];
    });
    labelToNames = invert(mapping);
  }
  recompute();

  function combine(list, l1, l2) {
    const a = Math.min(l1, l2);
    const b = Math.max(l1, l2);
    return list.map((item) => {
      if (item === b) {
        return a;
      } else if (item > b) {
        return item - 1;
      }
      return item;
    });
  }

  // Fixed-point algorithm that label if the names specified by labels
  // don't co-occur in the same year until no more improvements can be made
  // or we get down to only needing 16 colors.
  let changed = false;
  function iterate() {
    Object.keys(labelToNames).forEach((l1) => {
      const names1 = labelToNames[l1];
      Object.keys(labelToNames).forEach((l2) => {
        if (l1 < l2) {
          const names2 = labelToNames[l2];
          const canCombine = names1.every(n1 => names2.every(n2 => !pairs[`${n1}${n2}`]));
          if (canCombine) {
            console.log(`Combining ${l1} ${names1} with ${l2} ${names2}`);
            ret = combine(ret, l1, l2);
            recompute();
            changed = true;
            throw new Error('break');
          }
        }
      });
    });
  }
  do {
    changed = false;
    try {
      iterate();
    } catch (e) {
      // changed
    }
  } while (changed && max(ret) >= 16);

  // TODO check if can improve

  console.log(max(ret));

  return mapping;
}
