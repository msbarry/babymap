
// Render the time slider with logic for animating, drag and drop, etc.

import { select, event } from 'd3-selection';
import 'd3-transition';
import { easeCubicOut } from 'd3-ease';
import { scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { drag as d3Drag } from 'd3-drag';
import { line } from 'd3-shape';
import { timeout } from 'd3-timer';

const PLAY_PAUSE_SIZE = 20;
const EQUILATERAL_TRIANGLE_HEIGHT = Math.sqrt(0.75);
const TRIANGLE_CENTER_OF_MASS = EQUILATERAL_TRIANGLE_HEIGHT * (1 - (1 / Math.sqrt(2)));
const lineFunction = line()
  .x(d => d[0])
  .y(d => d[1]);

const MS_AT_MIN_YEAR = 1000;
const MS_AT_MAX_YEAR = 2000;
const MS_AT_EACH_YEAR = 150;


function renderPlay(selection) {
  const size = PLAY_PAUSE_SIZE;
  const triangleHeight = size * EQUILATERAL_TRIANGLE_HEIGHT;
  const centerOfMass = size * TRIANGLE_CENTER_OF_MASS;

  selection
    .attr('d', lineFunction([
      [-centerOfMass, 0],
      [-centerOfMass, -size / 2],
      [triangleHeight - centerOfMass, 0],
      [triangleHeight - centerOfMass, 0],
      [-centerOfMass, 0]
    ]) + lineFunction([
      [-centerOfMass, 0],
      [-centerOfMass, size / 2],
      [triangleHeight - centerOfMass, 0],
      [triangleHeight - centerOfMass, 0],
      [-centerOfMass, 0]
    ]))
    .attr('transform', 'rotate(0)');
}

function renderPause(selection) {
  const size = PLAY_PAUSE_SIZE;

  selection
    .attr('d', lineFunction([
      [-(size / 2), -(size / 2) + (size / 3)],
      [-(size / 2), -size / 2],
      [size / 2, -size / 2],
      [size / 2, -(size / 2) + (size / 3)],
      [-(size / 2), -(size / 2) + (size / 3)]
    ]) + lineFunction([
      [-(size / 2), (size / 2) - (size / 3)],
      [-(size / 2), size / 2],
      [size / 2, size / 2],
      [size / 2, (size / 2) - (size / 3)],
      [-(size / 2), (size / 2) - (size / 3)]
    ]))
    .attr('transform', 'rotate(90)');
}

export default function makeSlider({
  element,
  yearRange,
  onYearChange = () => {},
  persist = () => {},
  width: outerWidth = 800,
  height: outerHeight = 70
}) {
  let year = yearRange[0];
  const margin = {
    top: 20,
    right: 55,
    bottom: 20,
    left: 70
  };

  const height = outerHeight - margin.top - margin.bottom;
  const width = outerWidth - margin.left - margin.right;

  const [minYear, maxYear] = yearRange;

  const scale = scaleLinear()
    .domain(yearRange)
    .rangeRound([0, width]);

  const invertScale = scaleLinear()
    .domain([0, width])
    .rangeRound(yearRange)
    .clamp(true);

  function handleDrag() {
    stop();
    onYearChange(invertScale(event.x));
  }

  const container = select(element)
    .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top + (height / 2)})`);

  const svg = container.append('g');

  d3Drag()
    .on('drag', handleDrag)
    .on('start', handleDrag)
    .on('end', persist)
    .container(container.node())(svg);

  const allMarks = axisBottom(scale)
    .tickFormat(() => '')
    .ticks(maxYear - minYear)
    .tickSize(3);
  const decades = axisBottom(scale)
    .tickFormat(d => d);
  svg.append('g').call(allMarks);
  svg.append('g').call(decades);

  const slider = svg.append('circle')
    .attr('class', 'currentYear')
    .attr('r', 5);

  svg.append('rect')
    .attr('class', 'touchTarget')
    .attr('x', -10)
    .attr('y', -(height / 2) - margin.top)
    .attr('height', height + margin.top + margin.bottom)
    .attr('width', width + margin.right + 10);

  let playing = false;
  const playPauseContainer = container.append('g')
    .attr('transform', `translate(${-margin.left / 2})`);

  const playPause = playPauseContainer
    .append('path')
      .call(renderPlay);

  playPauseContainer.append('circle')
    .attr('class', 'touchTarget')
    .attr('r', PLAY_PAUSE_SIZE);

  let timer;

  function stop(dontPersist) {
    if (playing && !dontPersist) {
      persist();
    }
    playing = false;
    if (timer) timer.stop();
    playPause
      .transition()
      .ease(easeCubicOut)
      .call(renderPlay);
  }

  function nextTick() {
    if (year === maxYear) {
      onYearChange(minYear);
      timer = timeout(nextTick, MS_AT_MIN_YEAR);
    } else if (year === maxYear - 1) {
      onYearChange(maxYear);
      timer = timeout(nextTick, MS_AT_MAX_YEAR);
    } else {
      onYearChange(year + 1);
      timer = timeout(nextTick, MS_AT_EACH_YEAR);
    }
  }

  function start() {
    playing = true;
    nextTick();
    playPause
      .transition()
      .ease(easeCubicOut)
      .call(renderPause);
  }

  playPauseContainer
    .on('click', () => {
      if (playing) {
        stop();
      } else {
        start();
      }
    });

  return {
    setYear(newYear) {
      year = newYear;
      slider.attr('cx', scale(year));
    },
    stop,
    start
  };
}
