
// Main entry point - links the slider and map and sets up listeners
// to re-render on window size change and update the year/gender when
// hash changes.

import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { select, selectAll, event } from 'd3-selection';

import makeSlider from './slider';
import makeMap from './map';
import data from './data';
import './analytics';
import './style.css';

const yearRange = extent(Object.keys(data), d => +d);
const firstLoad = !window.location.hash;

let lastYear = null;
let lastGender = null;

const ios = /iPad|iPod|iPhone/.test(navigator.userAgent);
const pageWidth = ios ?
  () => document.body.clientWidth :
  () => window.innerWidth || document.documentElement.clientWidth;

const slider = makeSlider({
  element: '#slider',
  onYearChange,
  persist,
  width: 600,
  height: 70,
  yearRange
});

let map;

const widthScale = scaleLinear()
  .domain([600, 900])
  .range([600, 900])
  .clamp(true);

let lastWidth = 0;
function render() {
  const width = Math.round(pageWidth());
  if (width !== lastWidth) {
    map = makeMap({
      element: '#map',
      width: widthScale(width)
    });
    if (lastYear && lastGender) {
      map.setData(data[lastYear][lastGender]);
    }
  }
  lastWidth = width;
}
render();

const genderDisplay = selectAll('.gender');
const otherGenderDisplay = selectAll('.othergender');
const yearDisplay = selectAll('.year');
const maleToggle = selectAll('.togglecontainer [data-view="M"]');
const femaleToggle = selectAll('.togglecontainer [data-view="F"]');

// Hash/state change logic
let goingTo = false;
function goTo(year, gender) {
  const hash = `${gender}${year}`;
  goingTo = true;
  try {
    window.location.replace(`#${hash}`);
  } catch (e) {
    window.location.hash = hash;
  }
}
function persist() {
  goTo(lastYear, lastGender);
}
function onYearChange(year) {
  onStateChange(year, lastGender);
}
function onGenderChange(gender) {
  onStateChange(lastYear, gender);
}
function onStateChange(year, gender, stop) {
  if (year !== lastYear || lastGender !== gender) {
    if (stop) {
      slider.stop(true);
    }
    slider.setYear(year);
    map.setData(data[year][gender]);
    lastYear = year;
    lastGender = gender;
    genderDisplay.text(gender === 'M' ? 'boy' : 'girl');
    otherGenderDisplay.text(gender === 'M' ? 'girl' : 'boy');
    yearDisplay.text(year);
    maleToggle.classed('active', gender === 'M');
    femaleToggle.classed('active', gender === 'F');
  }
}
function hashchange() {
  if (!goingTo) {
    const gender = window.location.hash.substr(1, 1).toUpperCase();
    const year = +window.location.hash.substr(2, 4);
    onStateChange(
      year >= yearRange[0] && year <= yearRange[1] ? year : yearRange[1],
      gender === 'M' ? 'M' : 'F',
      true
    );
  }
  goingTo = false;
}

hashchange();
persist();
goingTo = false;

window.addEventListener('hashchange', hashchange);

select(window)
  .on('resize.watch', render)
  .on('load.watch', render)
  .on('orientationchange.watch', render)
  .on('keydown', () => {
    if (event.key === 'ArrowLeft' || event.which === 37) {
      slider.stop(true);
      onYearChange(lastYear - 1 < yearRange[0] ? yearRange[1] : lastYear - 1);
      persist();
    } else if (event.key === 'ArrowRight' || event.which === 39) {
      slider.stop(true);
      onYearChange(lastYear + 1 > yearRange[1] ? yearRange[0] : lastYear + 1);
      persist();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.which === 38 || event.which === 40) {
      slider.stop(true);
      onGenderChange(lastGender === 'M' ? 'F' : 'M');
      persist();
    }
  });

selectAll('.togglecontainer')
  .on('click', () => {
    onGenderChange(lastGender === 'M' ? 'F' : 'M');
    persist();
    event.stopPropagation();
    event.preventDefault();
  });

selectAll('.hidden').classed('hidden', false);

if (firstLoad) {
  setTimeout(() => {
    slider.start();
  });
}
