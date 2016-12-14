
// Render the map once initially then accept state colors later every time the year changes

import { select, event } from 'd3-selection';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import 'd3-transition';
import { drag as d3Drag } from 'd3-drag';
import { line } from 'd3-shape';

import scale from './scale';
import coords from '../data/state-centroids.json';
import us from '../data/us.json';

export default function makeMap({
  element,
  previousYear = () => {},
  nextYear = () => {},
  width: outerWidth = 800
}) {
  const margin = {
    top: 0,
    right: 22,
    bottom: 0,
    left: 0
  };

  const width = outerWidth - margin.left - margin.right;
  const height = width * 0.68;
  const outerHeight = height + margin.top + margin.bottom;

  const projection = geoAlbersUsa()
    .scale(width * 1.35)
    .translate([width / 2, height / 2])
    .precision(0.1);

  const path = geoPath()
    .projection(projection);

  const outerSvg = select(element).text('')
    .append('svg')
      .attr('class', 'map')
      .attr('width', outerWidth)
      .attr('height', outerHeight);

  // glow effect for label shadow
  const filter = outerSvg.append('defs')
    .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
  filter.append('feGaussianBlur')
      .attr('stdDeviation', '1')
      .attr('result', 'glow');
  const merge = filter.append('feMerge');
  merge.append('feMergeNode').attr('in', 'glow');

  const container = outerSvg
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  const sidenavwidth = 0.25;
  const containers = outerSvg.selectAll('.tapcontainer')
      .data(['left', 'right'])
      .enter()
    .append('g')
      .attr('class', 'tapcontainer')
      .on('touchstart', () => {});

  const navIndicators = containers.append('g')
    .attr('transform', (side) => {
      if (side === 'left') {
        return `translate(20,${outerHeight * 0.68})`;
      }
      return `translate(${outerWidth - 20},${outerHeight * 0.68})`;
    });
  navIndicators.append('circle').attr('r', 10);

  navIndicators.append('path')
    .attr('d', line()([
      [-1.5, -4],
      [2.5, 0],
      [-1.5, 4]
    ])).attr('transform', side => `rotate(${side === 'left' ? 180 : 0})`);

  containers.append('rect')
      .attr('class', side => side)
      .attr('x', side => (side === 'left' ? 0 : outerWidth * (1 - sidenavwidth)))
      .attr('y', 0)
      .attr('width', outerWidth * sidenavwidth)
      .attr('height', outerHeight * 0.9)
      .on('click', (side) => {
        if (side === 'left') {
          previousYear();
        } else {
          nextYear();
        }
      });

  const states = feature(us, us.objects.states).features;

  const areas = container.selectAll('.state')
      .data(states, state => state.id)
    .enter().append('path')
      .attr('class', 'state')
      .attr('d', path);

  // borders
  container.append('path')
      .datum(mesh(us, us.objects.states, (a, b) => a !== b))
      .attr('class', 'boundary')
      .attr('d', path);

  const labelShadows = container.selectAll('.label.shadow')
      .data(states, state => state.id)
    .enter().append('text')
      .attr('class', 'label shadow')
      .style('filter', 'url(#glow)');

  const labels = container.selectAll('.label.foreground')
      .data(states, state => state.id)
    .enter().append('text')
      .attr('class', 'label foreground');

  const update = () => {
    labels
      .style('text-anchor', ({ id }) => coords[id][2] || 'middle')
      .attr('transform', ({ id }) => `translate(${projection(coords[id])})`);
    labelShadows
      .style('text-anchor', ({ id }) => coords[id][2] || 'middle')
      .attr('transform', ({ id }) => `translate(${projection(coords[id])})`);
    const connectorsUpdate = container.selectAll('.connector')
        .data(states.filter(({ id }) => coords[id][3]), state => state.id);
    connectorsUpdate
      .enter().append('line')
        .attr('class', 'connector');
    container.selectAll('.connector')
        .attr('x1', ({ id }) => projection(coords[id])[0] + (coords[id][2] === 'start' ? -1 : 1))
        .attr('y1', ({ id }) => projection(coords[id])[1] - 3)
        .attr('x2', ({ id }) => coords[id][3] && projection([coords[id][3], coords[id][4]])[0])
        .attr('y2', ({ id }) => coords[id][4] && projection([coords[id][3], coords[id][4]])[1]);
  };

  update();

  if (process.env.NODE_ENV !== 'production') {
    d3Drag().on('drag', ({ id }) => {
      if (event.sourceEvent.shiftKey) {
        const dest = projection.invert([event.x, event.y]);
        coords[id][3] = dest[0];
        coords[id][4] = dest[1];
      } else {
        const [origLat, origLon, align, llat, llon] = coords[id];
        const [x, y] = projection([origLat, origLon]);
        const [lat, lon] = projection.invert([x + event.dx, y + event.dy]);
        coords[id] = [lat, lon, align, llat, llon];
      }
      update();
    })(labels);

    labels.on('click', ({ id }) => {
      const [lat, lon, align] = coords[id];
      coords[id] = [lat, lon, {
        middle: 'end',
        end: 'start',
        start: 'middle'
      }[align || 'middle']];
      update();
    });

    window.coords = coords;
  }

  return {
    setData(data) {
      areas.style('fill', d => scale(data[d.id]));
      labels.text(d => data[d.id]);
      labelShadows.text(d => data[d.id]);
    }
  };
}
