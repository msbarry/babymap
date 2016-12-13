set -e

if [ ! -d ne_50m_admin_1_states_provinces_lakes ]
then
  mkdir ne_50m_admin_1_states_provinces_lakes
  cd ne_50m_admin_1_states_provinces_lakes
  wget http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_admin_1_states_provinces_lakes.zip
  unzip *.zip
  cd ..
fi

ogr2ogr \
  -f GeoJSON \
  -where "iso_a2 IN ('US') and postal <> 'DC'" \
  states.json \
  ne_50m_admin_1_states_provinces_lakes/ne_50m_admin_1_states_provinces_lakes.shp

topojson \
  -o us.json \
  --id-property postal \
  --properties name=name \
  --properties id=postal \
  -- \
  states.json

toposimplify us.json -p 0.001 -f -F -o data/us.json
rm -f states.json
rm -f us.json
