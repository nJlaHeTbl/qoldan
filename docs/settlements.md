# Kazakhstan settlements

Source: https://download.geonames.org/export/dump/KZ.zip and
https://download.geonames.org/export/dump/alternatenames/KZ.zip (downloaded 2026-09-14).
License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/.
GeoNames provides data as-is, without guarantees of completeness or currency.

The generated files in public/settlements contain 11,476 populated-place records.
Only PPL, PPLA, PPLA2, PPLA3, PPLA4 and PPLC features are included. Abandoned,
historical and destroyed feature classes are excluded. 1,906 unassigned records
were excluded rather than assigned to a region by guesswork. Old names or
duplicate places may still occur. This is not an official KATO registry.

The importer uses GeoNames admin1 identifiers, not vehicle codes; their mapping
is explicit. Baikonur is included under geographical Kyzylorda for this market.
Russian/Kazakh aliases are preserved for search. Settlement centers are not
household addresses. Authors may edit the point manually and are warned that
submitted coordinates are public. Names may be entered freely when not found.

Regenerate using scripts/import-settlements.mjs with the extracted country and
alternate-name files. Review counts and region assignments before publishing.
No client call to a third-party geocoding API is needed. Only one region file is
loaded at a time; map tiles are served by OpenStreetMap with attribution.
