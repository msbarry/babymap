
// Function that returns color for a baby name

import colorMappings from '../data/colors.json';

export default function (name) {
  return colorMappings[name] || '#fff';
}
